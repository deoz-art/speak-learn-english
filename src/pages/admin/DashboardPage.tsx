import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, TrendingUp, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalStudents: number;
  totalLevels: number;
  avgScore: number;
  completionRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalLevels: 0,
    avgScore: 0,
    completionRate: 0,
  });
  const [registrationData, setRegistrationData] = useState<any[]>([]);
  const [levelPerformance, setLevelPerformance] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Total students
      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total levels
      const { count: levelsCount } = await supabase
        .from('levels')
        .select('*', { count: 'exact', head: true });

      // Average score and completion rate
      const { data: progressData } = await supabase
        .from('progress')
        .select('high_score, status');

      const completedLevels = progressData?.filter(p => p.status === 'completed') || [];
      const totalProgress = progressData?.length || 1;
      const avgScore = completedLevels.length > 0
        ? completedLevels.reduce((sum, p) => sum + p.high_score, 0) / completedLevels.length
        : 0;
      const completionRate = (completedLevels.length / totalProgress) * 100;

      setStats({
        totalStudents: studentsCount || 0,
        totalLevels: levelsCount || 0,
        avgScore: Math.round(avgScore),
        completionRate: Math.round(completionRate),
      });

      // Registration data (last 7 days)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const regData = last7Days.map(date => {
        const count = profiles?.filter(p => 
          p.created_at.startsWith(date)
        ).length || 0;
        return { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count };
      });
      setRegistrationData(regData);

      // Level performance
      const { data: levels } = await supabase
        .from('levels')
        .select('level_number, title');

      const perfData = await Promise.all(
        (levels || []).map(async (level) => {
          const { data } = await supabase
            .from('progress')
            .select('high_score')
            .eq('level_number', level.level_number)
            .eq('status', 'completed');

          const avg = data && data.length > 0
            ? data.reduce((sum, p) => sum + p.high_score, 0) / data.length
            : 0;

          return {
            level: `Level ${level.level_number}`,
            score: Math.round(avg),
          };
        })
      );
      setLevelPerformance(perfData);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome to your admin dashboard</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Quizzes</CardTitle>
            <BookOpen className="h-5 w-5 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalLevels}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <TrendingUp className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgScore}%</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            <Award className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completionRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Registrations (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance per Level</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={levelPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
