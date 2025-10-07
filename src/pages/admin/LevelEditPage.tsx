import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/ConfirmationModal';

interface Question {
  id?: string;
  question_text: string;
  image_url: string;
  options: string[];
  correct_answer: string;
}

export default function LevelEditPage() {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const isNew = levelId === 'new';

  const [levelNumber, setLevelNumber] = useState('');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew) {
      fetchLevel();
    }
  }, [levelId, isNew]);

  const fetchLevel = async () => {
    try {
      const { data: levelData, error: levelError } = await supabase
        .from('levels')
        .select('*')
        .eq('id', levelId)
        .single();

      if (levelError) throw levelError;

      setLevelNumber(levelData.level_number.toString());
      setTitle(levelData.title);
      setTheme(levelData.theme);
      setImageUrl(levelData.image_url);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('level_id', levelId);

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
    } catch (error) {
      console.error('Error fetching level:', error);
      toast.error('Failed to load level');
    }
  };

  const handleSaveLevel = async () => {
    if (!levelNumber || !title || !theme || !imageUrl) {
      toast.error('Please fill in all level fields');
      return;
    }

    setLoading(true);
    try {
      let savedLevelId = levelId;

      if (isNew) {
        const { data, error } = await supabase
          .from('levels')
          .insert({
            level_number: parseInt(levelNumber),
            title,
            theme,
            image_url: imageUrl,
          })
          .select()
          .single();

        if (error) throw error;
        savedLevelId = data.id;
      } else {
        const { error } = await supabase
          .from('levels')
          .update({
            level_number: parseInt(levelNumber),
            title,
            theme,
            image_url: imageUrl,
          })
          .eq('id', levelId);

        if (error) throw error;
      }

      // Save all questions
      for (const question of questions) {
        if (!question.question_text || !question.image_url || question.options.length < 2 || !question.correct_answer) {
          continue;
        }

        if (question.id) {
          await supabase
            .from('questions')
            .update({
              question_text: question.question_text,
              image_url: question.image_url,
              options: question.options,
              correct_answer: question.correct_answer,
            })
            .eq('id', question.id);
        } else {
          await supabase
            .from('questions')
            .insert({
              level_id: savedLevelId,
              level: parseInt(levelNumber),
              question_text: question.question_text,
              image_url: question.image_url,
              options: question.options,
              correct_answer: question.correct_answer,
            });
        }
      }

      toast.success(isNew ? 'Level created successfully' : 'Level updated successfully');
      navigate('/admin/levels');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save level');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        image_url: '',
        options: ['', '', '', ''],
        correct_answer: '',
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateQuestionOption = (qIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const deleteQuestion = async (index: number) => {
    const question = questions[index];
    
    if (question.id) {
      try {
        const { error } = await supabase
          .from('questions')
          .delete()
          .eq('id', question.id);

        if (error) throw error;
        toast.success('Question deleted');
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete question');
        return;
      }
    }

    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setDeleteQuestionId(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/levels')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold">
            {isNew ? 'Create New Level' : 'Edit Level'}
          </h1>
        </div>
        <Button onClick={handleSaveLevel} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Level'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Level Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="levelNumber">Level Number</Label>
              <Input
                id="levelNumber"
                type="number"
                value={levelNumber}
                onChange={(e) => setLevelNumber(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Restaurant Basics"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Food & Dining"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Level Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Questions</h2>
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {questions.map((question, qIndex) => (
        <Card key={qIndex}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Question {qIndex + 1}</CardTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteQuestionId(question.id || `new-${qIndex}`)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input
                value={question.question_text}
                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                placeholder="What is this?"
              />
            </div>

            <div className="space-y-2">
              <Label>Question Image URL</Label>
              <Input
                value={question.image_url}
                onChange={(e) => updateQuestion(qIndex, 'image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Options & Correct Answer</Label>
              <RadioGroup
                value={question.correct_answer}
                onValueChange={(value) => updateQuestion(qIndex, 'correct_answer', value)}
              >
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <RadioGroupItem value={option} id={`q${qIndex}-opt${optIndex}`} />
                    <Input
                      value={option}
                      onChange={(e) => updateQuestionOption(qIndex, optIndex, e.target.value)}
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                Select the radio button next to the correct answer
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      {questions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No questions yet</p>
            <Button onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Question
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmationModal
        open={deleteQuestionId !== null}
        onOpenChange={() => setDeleteQuestionId(null)}
        onConfirm={() => {
          const index = questions.findIndex(q => 
            q.id === deleteQuestionId || `new-${questions.indexOf(q)}` === deleteQuestionId
          );
          if (index !== -1) deleteQuestion(index);
        }}
        title="Delete Question"
        description="Are you sure you want to delete this question? This action cannot be undone."
      />
    </div>
  );
}
