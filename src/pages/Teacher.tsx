import { lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { DollarSign, BookOpen } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useAuth } from '../contexts/AuthContext';

const TeacherSales = lazy(() => import('./TeacherSales'));
const TeacherCourses = lazy(() => import('./TeacherCourses'));
const TeacherCourseEditor = lazy(() => import('./TeacherCourseEditor'));

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

  const isSales = location.pathname === '/teacher' || location.pathname === '/teacher/';
  const isCourses = location.pathname.startsWith('/teacher/courses');

  return (
    <>
      {/* Sub-nav */}
      <div className="fixed top-[88px] left-0 right-0 z-40 bg-background/70 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-2 flex gap-2">
          <Link
            to="/teacher"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.18em] transition-colors ${
              isSales
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-secondary/60 hover:text-cyan-200 border border-transparent'
            }`}
          >
            <DollarSign size={11} /> Doanh thu
          </Link>
          <Link
            to="/teacher/courses"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-tech text-[10px] uppercase tracking-[0.18em] transition-colors ${
              isCourses
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-secondary/60 hover:text-cyan-200 border border-transparent'
            }`}
          >
            <BookOpen size={11} /> Khoá học
          </Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <Routes>
          <Route index element={<TeacherSales />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="courses/:slug" element={<TeacherCourseEditor />} />
        </Routes>
      </Suspense>
    </>
  );
}
