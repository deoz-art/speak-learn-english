import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, Volume2, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createSpeechRecognition, speakText, findBestMatch, isSpeechRecognitionSupported } from '@/utils/speechRecognition';

interface Question {
  id: string;
  question_text: string;
  image_url: string;
  options: string[];
  correct_answer: string;
}

interface Level {
  id: string;
  level_number: number;
  title: string;
  image_url: string;
}

export default function QuizPage() {
  const { levelNumber } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [level, setLevel] = useState<Level | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      toast.error('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
    
    const speechRecognition = createSpeechRecognition();
    setRecognition(speechRecognition);
    
    fetchQuizData();

    return () => {
      if (speechRecognition) {
        speechRecognition.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [levelNumber]);

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      speakQuestion();
    }
  }, [currentQuestionIndex, questions]);

  const fetchQuizData = async () => {
    try {
      const { data: levelData, error: levelError } = await supabase
        .from('levels')
        .select('*')
        .eq('level_number', parseInt(levelNumber!))
        .single();

      if (levelError) throw levelError;
      setLevel(levelData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('level_id', levelData.id);

      if (questionsError) throw questionsError;
      setQuestions(questionsData);
    } catch (error: any) {
      toast.error(error.message);
      navigate('/levels');
    } finally {
      setLoading(false);
    }
  };

  const speakQuestion = async () => {
    if (questions[currentQuestionIndex]) {
      try {
        await speakText(questions[currentQuestionIndex].question_text);
      } catch (error) {
        console.error('Error speaking question:', error);
      }
    }
  };

  const startListening = () => {
    if (!recognition) {
      toast.error('Speech recognition not available');
      return;
    }

    setIsListening(true);
    setFeedbackText('Listening...');

    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setFeedbackText(`You said: "${spokenText}"`);
      handleSpeechResult(spokenText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setFeedbackText('Could not recognize speech. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSpeechResult = async (spokenText: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const matchResult = findBestMatch(spokenText, currentQuestion.options);

    if (!matchResult) {
      setFeedbackText(`Unrecognized answer. Please try again or click an option.`);
      return;
    }

    setSelectedOption(matchResult.match);
    checkAnswer(matchResult.match);
  };

  const checkAnswer = async (selectedAnswer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const correct = selectedAnswer === currentQuestion.correct_answer;
    
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
      toast.success('Correct! 🎉');
      setTimeout(() => nextQuestion(), 2000);
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      toast.error('Incorrect!');

      if (newMistakes >= 3) {
        toast.error('You made 3 mistakes. Quiz ended.');
        setTimeout(() => endQuiz(true), 2000);
      } else {
        setTimeout(() => nextQuestion(), 2500);
      }
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setIsCorrect(null);
      setFeedbackText('');
    } else {
      endQuiz(false);
    }
  };

  const endQuiz = async (failedDueToMistakes: boolean) => {
    const finalScore = failedDueToMistakes ? 0 : score;
    
    try {
      // Update progress
      const { error: progressError } = await supabase
        .from('progress')
        .update({
          status: failedDueToMistakes ? 'unlocked' : 'completed',
          high_score: finalScore,
        })
        .eq('user_id', user!.id)
        .eq('level_number', parseInt(levelNumber!));

      if (progressError) throw progressError;

      // Unlock next level if completed successfully
      if (!failedDueToMistakes) {
        const nextLevel = parseInt(levelNumber!) + 1;
        await supabase
          .from('progress')
          .update({ status: 'unlocked' })
          .eq('user_id', user!.id)
          .eq('level_number', nextLevel);
      }

      toast.success(
        failedDueToMistakes
          ? 'Try again!'
          : `Level completed! Score: ${finalScore}/${questions.length}`
      );
      
      setTimeout(() => navigate('/levels'), 2000);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate('/levels')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Levels
            </Button>
            <div className="flex gap-4">
              <Badge variant="outline">Score: {score}</Badge>
              <Badge variant={mistakes >= 2 ? 'destructive' : 'secondary'}>
                Mistakes: {mistakes}/3
              </Badge>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {level && (
          <div className="mb-6">
            <div className="relative h-48 rounded-xl overflow-hidden shadow-medium mb-4">
              <img
                src={level.image_url}
                alt={level.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent flex items-end">
                <div className="p-6">
                  <h1 className="text-3xl font-bold text-background">Level {level.level_number}: {level.title}</h1>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentQuestion && (
          <Card className="shadow-large">
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="relative h-64 rounded-lg overflow-hidden mb-6 shadow-medium">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={speakQuestion}
                    className="flex-shrink-0"
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                  <h2 className="text-2xl font-bold flex-grow">
                    {currentQuestion.question_text}
                  </h2>
                </div>
              </div>

              <div className="mb-6">
                <Button
                  onClick={startListening}
                  disabled={isListening || selectedOption !== null}
                  className="w-full py-6 text-lg bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  <Mic className={`h-6 w-6 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
                  {isListening ? 'Listening...' : 'Speak Your Answer 🎙️'}
                </Button>
                
                {feedbackText && (
                  <div className="mt-4 p-4 rounded-lg bg-accent text-accent-foreground flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>{feedbackText}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium mb-3">Or select an option:</p>
                {currentQuestion.options.map((option) => {
                  const isSelected = option === selectedOption;
                  const isCorrectAnswer = option === currentQuestion.correct_answer;
                  const showCorrect = selectedOption && isCorrectAnswer;
                  const showIncorrect = isSelected && !isCorrect;

                  return (
                    <Button
                      key={option}
                      onClick={() => {
                        if (selectedOption === null) {
                          setSelectedOption(option);
                          checkAnswer(option);
                        }
                      }}
                      disabled={selectedOption !== null}
                      variant="outline"
                      className={`w-full justify-start text-left h-auto py-4 px-6 text-base transition-all ${
                        showCorrect ? 'bg-success text-success-foreground border-success' : ''
                      } ${showIncorrect ? 'bg-error text-error-foreground border-error' : ''}`}
                    >
                      <span className="flex items-center gap-3">
                        {showCorrect && <CheckCircle2 className="h-5 w-5" />}
                        {showIncorrect && <XCircle className="h-5 w-5" />}
                        {option}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
