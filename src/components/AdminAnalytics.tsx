import { useEffect, useState } from 'react';
import { Loader2, Users, TrendingUp, BookOpen, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Stats {
  totalUsers: number;
  totalEnrollments: number;
  totalRevenue: number;
  totalCourses: number;
  recentSignups: number;
  quizPassRate: number;
}

export default function AdminAnalytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: enrollments }, { data: orders }, { count: courses }, { data: recentUsers }, { data: attempts }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('amount_vnd').eq('status', 'confirmed'),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('id').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from('quiz_attempts').select('final_score, auto_score').in('status', ['submitted', 'graded']),
      ]);

      const revenue = (orders ?? []).reduce((s, o) => s + ((o.amount_vnd as number) ?? 0), 0);
      const scores = (attempts ?? []).map((a) => (a.final_score ?? a.auto_score ?? 0) as number);
      const passRate = scores.length > 0 ? (scores.filter((s) => s >= 60).length / scores.length) * 100 : 0;

      setStats({
        totalUsers: users ?? 0,
        totalEnrollments: enrollments ?? 0,
        totalRevenue: revenue,
        totalCourses: courses ?? 0,
        recentSignups: recentUsers?.length ?? 0,
        quizPassRate: passRate,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Người dùng" value={String(stats.totalUsers)} sub={`+${stats.recentSignups} tuần này`} />
        <StatCard icon={BookOpen} label="Khoá học" value={String(stats.totalCourses)} />
        <StatCard icon={TrendingUp} label="Đăng ký" value={String(stats.totalEnrollments)} />
        <StatCard icon={DollarSign} label="Doanh thu" value={`${(stats.totalRevenue / 1000).toFixed(0)}K`} />
      </div>
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Tỉ lệ đậu quiz (≥60%)</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${stats.quizPassRate}%` }} />
          </div>
          <span className="font-headline text-lg font-bold text-emerald-300 tabular-nums">{stats.quizPassRate.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-1">
      <Icon size={16} className="text-primary" />
      <p className="font-headline text-xl font-extrabold text-on-surface tabular-nums">{value}</p>
      <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/55">{label}</p>
      {sub && <p className="font-tech text-[9px] text-cyan-300">{sub}</p>}
    </div>
  );
}
