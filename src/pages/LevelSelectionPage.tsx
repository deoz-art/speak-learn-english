import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle2, Play, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface Level {
  id: string;
  level_number: number;
  title: string;
  theme: string;
  image_url: string;
}

interface Progress {
  level_number: number;
  status: 'locked' | 'unlocked' | 'completed';
  high_score: number;
}

export default function LevelSelectionPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [levelsRes, progressRes] = await Promise.all([
        supabase.from('levels').select('*').order('level_number'),
        supabase.from('progress').select('*').eq('user_id', user!.id),
      ]);

      if (levelsRes.error) throw levelsRes.error;
      if (progressRes.error) throw progressRes.error;

      setLevels(levelsRes.data);
      setProgress(progressRes.data as Progress[]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = (levelNumber: number) => {
    return progress.find((p) => p.level_number === levelNumber);
  };

  const handleLevelClick = (level: Level) => {
    const levelProgress = getLevelProgress(level.level_number);
    
    if (levelProgress?.status === 'locked') {
      toast.error('Complete previous levels to unlock this one!');
      return;
    }

    navigate(`/quiz/${level.level_number}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">English Quiz Master</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Choose Your Level</h2>
          <p className="text-muted-foreground">Select a level to start your voice quiz</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {levels.map((level) => {
            const levelProgress = getLevelProgress(level.level_number);
            const isLocked = levelProgress?.status === 'locked';
            const isCompleted = levelProgress?.status === 'completed';

            return (
              <Card
                key={level.id}
                className={`overflow-hidden transition-all hover:shadow-medium cursor-pointer ${
                  isLocked ? 'opacity-60' : ''
                }`}
                onClick={() => handleLevelClick(level)}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={level.image_url}
                    alt={level.title}
                    className="w-full h-full object-cover"
                  />
                  {isLocked && (
                    <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                      <Lock className="h-12 w-12 text-background" />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Completed
                      </Badge>
                    </div>
                  )}
                </div>

                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Level {level.level_number}</CardTitle>
                    {levelProgress && levelProgress.high_score > 0 && (
                      <Badge variant="secondary">Score: {levelProgress.high_score}</Badge>
                    )}
                  </div>
                  <CardDescription className="font-semibold text-foreground">
                    {level.title}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{level.theme}</p>
                  <Button className="w-full" disabled={isLocked}>
                    {isLocked ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Locked
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {isCompleted ? 'Play Again' : 'Start Quiz'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
