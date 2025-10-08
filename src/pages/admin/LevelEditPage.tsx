import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const isNew = levelId === 'new';

  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState({
    level_number: 0,
    title: '',
    theme: '',
    image_url: '',
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; questionId: string | null }>({
    open: false,
    questionId: null,
  });

  useEffect(() => {
    if (!isNew && levelId) {
      fetchLevel();
      fetchQuestions();
    }
  }, [levelId, isNew]);

  const fetchLevel = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .eq('id', levelId)
        .maybeSingle();

      if (error) throw error;
      if (data) setLevel(data);
    } catch (error) {
      console.error('Error fetching level:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch level',
        variant: 'destructive',
      });
    }
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('level_id', levelId);

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleSaveLevel = async () => {
    setLoading(true);
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('levels')
          .insert([level])
          .select()
          .single();

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Level created successfully',
        });
        navigate(`/admin/levels/${data.id}`);
      } else {
        const { error } = await supabase
          .from('levels')
          .update(level)
          .eq('id', levelId);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Level updated successfully',
        });
      }
    } catch (error) {
      console.error('Error saving level:', error);
      toast({
        title: 'Error',
        description: 'Failed to save level',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
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

  const handleUpdateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleSaveQuestion = async (index: number) => {
    const question = questions[index];
    setLoading(true);

    try {
      if (question.id) {
        const { error } = await supabase
          .from('questions')
          .update({
            question_text: question.question_text,
            image_url: question.image_url,
            options: question.options,
            correct_answer: question.correct_answer,
          })
          .eq('id', question.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('questions')
          .insert([{
            level_id: levelId,
            question_text: question.question_text,
            image_url: question.image_url,
            options: question.options,
            correct_answer: question.correct_answer,
          }]);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Question saved successfully',
      });
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({
        title: 'Error',
        description: 'Failed to save question',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteModal.questionId) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', deleteModal.questionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Question deleted successfully',
      });
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete question',
        variant: 'destructive',
      });
    } finally {
      setDeleteModal({ open: false, questionId: null });
    }
  };

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={() => navigate('/admin/levels')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Levels
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {isNew ? 'Create New Level' : 'Edit Level'}
        </h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Level Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="level_number">Level Number</Label>
            <Input
              id="level_number"
              type="number"
              value={level.level_number}
              onChange={(e) => setLevel({ ...level, level_number: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={level.title}
              onChange={(e) => setLevel({ ...level, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              value={level.theme}
              onChange={(e) => setLevel({ ...level, theme: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={level.image_url}
              onChange={(e) => setLevel({ ...level, image_url: e.target.value })}
            />
          </div>
          <Button onClick={handleSaveLevel} disabled={loading}>
            {loading ? 'Saving...' : 'Save Level'}
          </Button>
        </CardContent>
      </Card>

      {!isNew && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Questions</h2>
            <Button onClick={handleAddQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          <div className="space-y-6">
            {questions.map((question, index) => (
              <Card key={question.id || index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Question {index + 1}</span>
                    {question.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, questionId: question.id! })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Question Text</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) => handleUpdateQuestion(index, 'question_text', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input
                      value={question.image_url}
                      onChange={(e) => handleUpdateQuestion(index, 'image_url', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Options</Label>
                    {question.options.map((option, optionIndex) => (
                      <Input
                        key={optionIndex}
                        className="mb-2"
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option}
                        onChange={(e) => handleUpdateOption(index, optionIndex, e.target.value)}
                      />
                    ))}
                  </div>
                  <div>
                    <Label>Correct Answer</Label>
                    <Input
                      value={question.correct_answer}
                      onChange={(e) => handleUpdateQuestion(index, 'correct_answer', e.target.value)}
                    />
                  </div>
                  <Button onClick={() => handleSaveQuestion(index)} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Question'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ConfirmationModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, questionId: null })}
        onConfirm={handleDeleteQuestion}
        title="Delete Question"
        description="Are you sure you want to delete this question?"
      />
    </div>
  );
}
