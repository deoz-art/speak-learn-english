import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationModal } from '@/components/ConfirmationModal';

interface Level {
  id: string;
  level_number: number;
  title: string;
  theme: string;
  image_url: string;
}

export default function LevelsPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; levelId: string | null }>({
    open: false,
    levelId: null,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level_number', { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch levels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.levelId) return;

    try {
      const { error } = await supabase.from('levels').delete().eq('id', deleteModal.levelId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Level deleted successfully',
      });
      fetchLevels();
    } catch (error) {
      console.error('Error deleting level:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete level',
        variant: 'destructive',
      });
    } finally {
      setDeleteModal({ open: false, levelId: null });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Levels Management</h1>
          <p className="text-muted-foreground">Manage quiz levels and questions</p>
        </div>
        <Button onClick={() => navigate('/admin/levels/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Level
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {levels.map((level) => (
          <Card key={level.id}>
            <CardHeader>
              <div className="aspect-video overflow-hidden rounded-lg">
                <img
                  src={level.image_url}
                  alt={level.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2">
                Level {level.level_number}: {level.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{level.theme}</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/admin/levels/${level.id}`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteModal({ open: true, levelId: level.id })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <ConfirmationModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, levelId: null })}
        onConfirm={handleDelete}
        title="Delete Level"
        description="Are you sure you want to delete this level? All associated questions will also be deleted."
      />
    </div>
  );
}
