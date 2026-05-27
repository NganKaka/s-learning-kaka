import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, TrendingUp, Activity, Target, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import {
  type LinkedStudent,
  type StudentScore,
  getLinkedStudents,
  getStudentScores,
} from '../lib/parent';
import {
  type ActivityEntry,
  getActivityLog,
  getClassAverage,
  getStudentTotalScore,
  getStudentGoals,
} from '../lib/parentHelpers';

export default function ParentDashboard() {
  const { user, loading } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [classAvg, setClassAvg] = useState<number | null>(null);
  const [studentScore, setStudentScore] = useState<number>(0);
  const [goals, setGoals] = useState<{ current: { lessons_target: number; flashcards_target: number; quizzes_target: number; lessons_done: number; flashcards_done: number; quizzes_done: number; met: boolean } | null; history: Array<{ week_start: string; met: boolean }> }>({ current: null, history: [] });

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoadingStudents(true);
    const data = await getLinkedStudents(user.id);
    setStudents(data);
    if (data.length > 0 && !selectedStudent) setSelectedStudent(data[0]);
    setLoadingStudents(false);
  }, [user]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => {
    if (!selectedStudent) { setScores([]); return; }
    let cancelled = false;
    setLoadingScores(true);
    getStudentScores(selectedStudent.student_id, selectedStudent.course_id).then((s) => {
      if (!cancelled) { setScores(s); setLoadingScores(false); }
    });
    getActivityLog(selectedStudent.student_id).then((a) => { if (!cancelled) setActivities(a); });
    getClassAverage(selectedStudent.course_id).then((avg) => { if (!cancelled) setClassAvg(avg); });
    getStudentTotalScore(selectedStudent.student_id, selectedStudent.course_id).then((sc) => { if (!cancelled) setStudentScore(sc); });
    getStudentGoals(selectedStudent.student_id).then((g) => { if (!cancelled) setGoals(g); });
    return () => { cancelled = true; };
  }, [selectedStudent]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Chart data
  const lineData = scores.map((s) => ({
    name: s.lesson_title.length > 15 ? s.lesson_title.slice(0, 15) + '…' : s.lesson_title,
    score: s.final_score ?? s.auto_score ?? 0,
  }));

  if (loadingStudents) {
    return <PageShell><div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-primary" /></div></PageShell>;
  }

  if (students.length === 0) {
    return (
      <PageShell>
        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-12 text-center space-y-3">
          <TrendingUp size={32} className="mx-auto text-secondary/40" />
          <p className="text-secondary/70">Chưa có học viên nào được gán cho bạn.</p>
          <p className="text-xs text-secondary/50">Vui lòng liên hệ quản trị viên để được gán theo dõi học viên.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header + student selector */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="font-headline text-2xl font-extrabold text-on-surface">
            Kết quả học tập
          </h1>
          {students.length > 1 && (
            <div className="flex gap-2">
              {students.map((s) => (
                <button
                  key={s.link.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`rounded-full px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    selectedStudent?.link.id === s.link.id
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-secondary/60 border border-transparent hover:text-cyan-200'
                  }`}
                >
                  {s.student_name ?? 'Học viên'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Student info card */}
        {selectedStudent && (
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-headline text-lg font-bold text-on-surface">{selectedStudent.student_name ?? 'Học viên'}</p>
              <p className="text-sm text-secondary/60">{selectedStudent.course_title}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="font-headline text-xl font-extrabold text-primary tabular-nums">{studentScore.toFixed(0)}</p>
                <p className="font-tech text-[9px] uppercase text-secondary/55">Tổng điểm</p>
              </div>
              {classAvg !== null && (
                <div className="text-center">
                  <p className="font-headline text-xl font-extrabold text-secondary/60 tabular-nums">{classAvg.toFixed(0)}</p>
                  <p className="font-tech text-[9px] uppercase text-secondary/55">TB lớp</p>
                </div>
              )}
              <div className="text-center">
                <p className="font-headline text-xl font-extrabold text-cyan-200 tabular-nums">{scores.length}</p>
                <p className="font-tech text-[9px] uppercase text-secondary/55">Lượt thi</p>
              </div>
            </div>
          </div>
        )}

        {loadingScores ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>
        ) : scores.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-secondary/65 text-sm">
            Học viên chưa hoàn thành bài kiểm tra nào.
          </div>
        ) : (
          <>
            {/* Line chart: score progression */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                <TrendingUp size={12} /> Tiến trình điểm
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} unit="%" />
                    <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(103,232,249,0.3)', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="#67e8f9" strokeWidth={2} dot={{ fill: '#67e8f9', r: 4 }} name="Điểm (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Score table */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">Chi tiết các lượt làm</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">Bài</th>
                      <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">Lượt</th>
                      <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">Điểm</th>
                      <th className="pb-2 font-tech text-[10px] uppercase tracking-[0.14em] text-secondary/55">Ngày</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((s, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 text-on-surface">{s.lesson_title}</td>
                        <td className="py-2 text-secondary/70 tabular-nums">#{s.attempt_number}</td>
                        <td className="py-2 tabular-nums text-cyan-200">{(s.final_score ?? s.auto_score ?? 0).toFixed(0)}%</td>
                        <td className="py-2 text-secondary/55 text-xs">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('vi-VN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Goals */}
        {goals.current && (
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
              <Target size={12} /> Mục tiêu tuần {goals.current.met && <span className="text-emerald-400">✓ Đạt</span>}
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-headline text-lg font-bold text-on-surface tabular-nums">{goals.current.lessons_done}/{goals.current.lessons_target}</p>
                <p className="font-tech text-[9px] uppercase text-secondary/55">Bài học</p>
              </div>
              <div>
                <p className="font-headline text-lg font-bold text-on-surface tabular-nums">{goals.current.flashcards_done}/{goals.current.flashcards_target}</p>
                <p className="font-tech text-[9px] uppercase text-secondary/55">Flashcards</p>
              </div>
              <div>
                <p className="font-headline text-lg font-bold text-on-surface tabular-nums">{goals.current.quizzes_done}/{goals.current.quizzes_target}</p>
                <p className="font-tech text-[9px] uppercase text-secondary/55">Quiz</p>
              </div>
            </div>
          </div>
        )}

        {/* Activity log */}
        {activities.length > 0 && (
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
              <Activity size={12} /> Hoạt động gần đây
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activities.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <span className="text-sm text-on-surface">{formatAction(a.action)}</span>
                  <span className="font-tech text-[9px] tabular-nums text-secondary/45 shrink-0">{new Date(a.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    lesson_view: '📚 Xem bài học',
    quiz_submit: '📝 Nộp bài kiểm tra',
    flashcard_review: '🧠 Ôn flashcards',
    login: '🔑 Đăng nhập',
    'milestone:perfect_quiz': '🏆 Đạt điểm tuyệt đối',
    'milestone:module_complete': '📚 Hoàn thành chương',
    'milestone:streak_7': '🔥 Streak 7 ngày',
  };
  return map[action] ?? action;
}
