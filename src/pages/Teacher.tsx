import { lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { DollarSign, BookOpen, TrendingUp, Users, Megaphone } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';

const TeacherSales = lazy(() => import('./TeacherSales'));
const TeacherCourses = lazy(() => import('./TeacherCourses'));
const TeacherCourseEditor = lazy(() => import('./TeacherCourseEditor'));
const TeacherRevenue = lazy(() => import('./TeacherRevenue'));
const TeacherStudents = lazy(() => import('./TeacherStudents'));
const TeacherAnnouncements = lazy(() => import('./TeacherAnnouncements'));

const TABS = [
  { to: '/teacher', label: 'Đơn chờ', icon: DollarSign, match: (p: string) => p === '/teacher' || p === '/teacher/' },
  { to: '/teacher/revenue', label: 'Doanh thu', icon: TrendingUp, match: (p: string) => p.startsWith('/teacher/revenue') },
  { to: '/teacher/courses', label: 'Khoá học', icon: BookOpen, match: (p: string) => p.startsWith('/teacher/courses') },
  { to: '/teacher/students', label: 'Học viên', icon: Users, match: (p: string) => p.startsWith('/teacher/students') },
  { to: '/teacher/announcements', label: 'Thông báo', icon: Megaphone, match: (p: string) => p.startsWith('/teacher/announcements') },
];

export default function Teacher() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 animate-pulse min-h-[300px]" />
      </PageShell>
    );
  }

  if (!user) return <Navigate to="/login?next=/teacher" replace />;
  if (!profile?.is_instructor) {
    return (
      <PageShell>
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-secondary/80">Tài khoản này không có quyền giảng viên.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <div className="fixed top-[88px] left-0 right-0 z-40 bg-background/70 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-2 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.match(location.pathname);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.18em] transition-colors shrink-0 ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-secondary/60 hover:text-cyan-200 border border-transparent'
                }`}
              >
                <Icon size={11} /> {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Suspense fallback={null}>
        <Routes>
          <Route index element={<TeacherSales />} />
          <Route path="revenue" element={<TeacherRevenue />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/:slug" element={<TeacherCourseEditor />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="announcements" element={<TeacherAnnouncements />} />
        </Routes>
      </Suspense>
    </>
  );
}
