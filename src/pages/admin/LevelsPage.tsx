import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
  const [deleteLevelId, setDeleteLevelId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level_number');

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast.error('Failed to load levels');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    try {
      // Delete all questions for this level first
      await supabase
        .from('questions')
        .delete()
        .eq('level_id', levelId);

      // Delete the level
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', levelId);

      if (error) throw error;

      toast.success('Level deleted successfully');
      fetchLevels();
      setDeleteLevelId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete level');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Content Management</h1>
          <p className="text-muted-foreground">Manage quiz levels and questions</p>
        </div>
        <Button onClick={() => navigate('/admin/levels/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Level
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {levels.map((level) => (
          <Card key={level.id} className="overflow-hidden">
            <div className="relative h-48">
              <img
                src={level.image_url}
                alt={level.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <Badge className="bg-background/90 text-foreground">
                  Level {level.level_number}
                </Badge>
              </div>
            </div>
            <CardHeader>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{level.title}</h3>
                <p className="text-sm text-muted-foreground">{level.theme}</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/admin/levels/${level.id}/edit`)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteLevelId(level.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {levels.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No levels found</p>
            <Button onClick={() => navigate('/admin/levels/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Level
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmationModal
        open={deleteLevelId !== null}
        onOpenChange={() => setDeleteLevelId(null)}
        onConfirm={() => deleteLevelId && handleDeleteLevel(deleteLevelId)}
        title="Delete Level"
        description="Are you sure you want to delete this level? All associated questions will also be deleted. This action cannot be undone."
      />
    </div>
  );
}
