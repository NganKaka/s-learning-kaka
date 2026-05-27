import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Plus, Users, TrendingUp, Activity, Target, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';
import {
  type LinkedStudent,
  type StudentScore,
  getLinkedStudents,
  getStudentScores,
  linkCode,
} from '../lib/parent';
import {
  type ActivityEntry,
  getActivityLog,
  getClassAverage,
  getStudentTotalScore,
  getStudentGoals,
} from '../lib/parentHelpers';

export default function ParentDashboard() {
  const { user, profile, loading } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [code, setCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
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
    setLoadingStudents(false);
  }, [user]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (!selectedStudent) {
      setScores([]);
      return;
    }
    let cancelled = false;
    setLoadingScores(true);
    getStudentScores(selectedStudent.student_id, selectedStudent.course_id).then((s) => {
      if (!cancelled) {
        setScores(s);
        setLoadingScores(false);
      }
    });
    getActivityLog(selectedStudent.student_id).then((a) => { if (!cancelled) setActivities(a); });
    getClassAverage(selectedStudent.course_id).then((avg) => { if (!cancelled) setClassAvg(avg); });
    getStudentTotalScore(selectedStudent.student_id, selectedStudent.course_id).then((sc) => { if (!cancelled) setStudentScore(sc); });
    getStudentGoals(selectedStudent.student_id).then((g) => { if (!cancelled) setGoals(g); });
    return () => { cancelled = true; };
  }, [selectedStudent]);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim()) return;
    setLinking(true);
    setLinkError(null);
    const result = await linkCode(user.id, code.trim());
    setLinking(false);
    if (result.error) {
      setLinkError(result.error);
    } else {
      setCode('');
      fetchStudents();
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Chart data: score over time (line chart)
  const lineData = scores.map((s) => ({
    name: s.lesson_title.length > 12 ? s.lesson_title.slice(0, 12) + '…' : s.lesson_title,
    score: s.final_score ?? s.auto_score ?? 0,
    date: s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('vi-VN') : '',
  }));

  // Bar chart: best score per quiz
  const quizBest: Record<string, { name: string; score: number }> = {};
  for (const s of scores) {
    const key = s.quiz_id;
    const val = s.final_score ?? s.auto_score ?? 0;
    if (!quizBest[key] || val > quizBest[key].score) {
      quizBest[key] = {
        name: s.lesson_title.length > 12 ? s.lesson_title.slice(0, 12) + '…' : s.lesson_title,
        score: val,
      };
    }
  }
  const barData = Object.values(quizBest);

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users size={20} className="text-primary" />
          <h1 className="font-headline text-2xl font-extrabold text-on-surface">
            Theo dõi kết quả học tập
          </h1>
        </div>

        {/* Link code form */}
        <form onSubmit={handleLink} className="glass-card rounded-2xl p-5 space-y-3">
          <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
            Nhập mã theo dõi
          </p>
          <p className="text-sm text-secondary/70">
            Giáo viên sẽ cung cấp mã theo dõi riêng cho từng học viên. Nhập mã để xem kết quả.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VD: ABC123XY"
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-on-surface focus:border-cyan-300/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={linking || !code.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-5 py-2.5 text-xs font-tech uppercase tracking-[0.16em] text-primary hover:bg-primary/25 disabled:opacity-50"
            >
              {linking ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Liên kết
            </button>
          </div>
          {linkError && (
            <p className="text-xs text-red-300">{linkError}</p>
          )}
        </form>

        {/* Linked students */}
        {loadingStudents ? (
          <div className="glass-card rounded-2xl p-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-secondary/65 text-sm">
            Chưa liên kết học viên nào. Nhập mã theo dõi ở trên để bắt đầu.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
              Học viên đã liên kết ({students.length})
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {students.map((s) => (
                <button
                  key={s.link.id}
                  type="button"
                  onClick={() => setSelectedStudent(s)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    selectedStudent?.link.id === s.link.id
                      ? 'border-cyan-300/50 bg-cyan-400/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-cyan-300/30'
                  }`}
                >
                  <p className="font-headline font-bold text-on-surface">
                    {s.student_name ?? 'Học viên'}
                  </p>
                  <p className="text-xs text-secondary/60 mt-1">{s.course_title}</p>
                  <p className="font-tech text-[9px] uppercase tracking-[0.14em] text-secondary/45 mt-1">
                    Mã: {s.link.tracking_code}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Score charts */}
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <p className="font-tech text-[10px] uppercase tracking-[0.2em] text-primary">
                Kết quả — {selectedStudent.student_name ?? 'Học viên'} · {selectedStudent.course_title}
              </p>
            </div>

            {loadingScores ? (
              <div className="glass-card rounded-2xl p-8 flex justify-center">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            ) : scores.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-secondary/65 text-sm">
                Học viên chưa hoàn thành bài kiểm tra nào.
              </div>
            ) : (
              <>
                {/* Line chart: score progression */}
                <div className="glass-card rounded-2xl p-5 space-y-3">
                  <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                    Tiến trình điểm theo thời gian
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          unit="%"
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(15,23,42,0.95)',
                            border: '1px solid rgba(103,232,249,0.3)',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#67e8f9"
                          strokeWidth={2}
                          dot={{ fill: '#67e8f9', r: 4 }}
                          name="Điểm (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar chart: best score per quiz */}
                <div className="glass-card rounded-2xl p-5 space-y-3">
                  <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                    Điểm cao nhất mỗi bài kiểm tra
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                          unit="%"
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(15,23,42,0.95)',
                            border: '1px solid rgba(103,232,249,0.3)',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Bar
                          dataKey="score"
                          fill="#67e8f9"
                          radius={[4, 4, 0, 0]}
                          name="Điểm (%)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Score table */}
                <div className="glass-card rounded-2xl p-5 space-y-3">
                  <p className="font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                    Chi tiết các lượt làm
                  </p>
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
                            <td className="py-2 tabular-nums text-cyan-200">
                              {(s.final_score ?? s.auto_score ?? 0).toFixed(0)}%
                            </td>
                            <td className="py-2 text-secondary/55 text-xs">
                              {s.submitted_at
                                ? new Date(s.submitted_at).toLocaleDateString('vi-VN')
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Class average comparison */}
            {classAvg !== null && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                  <BarChart3 size={12} /> So sánh với lớp
                </p>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="font-headline text-2xl font-extrabold text-primary tabular-nums">{studentScore.toFixed(0)}</p>
                    <p className="font-tech text-[9px] uppercase text-secondary/55">Con bạn</p>
                  </div>
                  <div className="text-center">
                    <p className="font-headline text-2xl font-extrabold text-secondary/70 tabular-nums">{classAvg.toFixed(0)}</p>
                    <p className="font-tech text-[9px] uppercase text-secondary/55">TB lớp</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-white/10 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/60" style={{ width: `${Math.min(100, (studentScore / Math.max(1, classAvg)) * 50)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Goal visibility */}
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
                {goals.history.length > 1 && (
                  <div className="flex gap-1.5 items-center">
                    <span className="font-tech text-[9px] text-secondary/45">Lịch sử:</span>
                    {goals.history.map((h) => (
                      <span key={h.week_start} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] ${h.met ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                        {h.met ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity log */}
            {activities.length > 0 && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <p className="inline-flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.18em] text-secondary/55">
                  <Activity size={12} /> Hoạt động gần đây
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activities.slice(0, 15).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <span className="text-sm text-on-surface">{formatAction(a.action)}</span>
                      <span className="font-tech text-[9px] tabular-nums text-secondary/45 shrink-0">
                        {new Date(a.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
