import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollProgress from './components/ScrollProgress';
import Spotlight from './components/Spotlight';
import SmoothScroll from './components/SmoothScroll';
import RouteTransition from './components/RouteTransition';
import CursorTrail from './components/CursorTrail';
import FilmGrain from './components/FilmGrain';
import ScrollVignette from './components/ScrollVignette';
import CommandPaletteHost from './components/CommandPaletteHost';
import NotFound from './components/NotFound';
import { ActiveSectionProvider } from './contexts/ActiveSectionContext';

import Home from './pages/Home';
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Learn = lazy(() => import('./pages/Learn'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cards = lazy(() => import('./pages/Cards'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Cart = lazy(() => import('./pages/Cart'));
const Account = lazy(() => import('./pages/Account'));
const Teacher = lazy(() => import('./pages/Teacher'));

function AnimatedRoutes() {
  return (
    <RouteTransition>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/learn/:courseSlug/:lessonSlug" element={<Learn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/account" element={<Account />} />
          <Route path="/teacher/*" element={<Teacher />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteTransition>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ActiveSectionProvider>
          <SmoothScroll />
          <ScrollProgress />
          <ScrollVignette />
          <FilmGrain />
          <Spotlight />
          <CursorTrail />
          <CommandPaletteHost />
          <AnimatePresence mode="wait">
            <AnimatedRoutes />
          </AnimatePresence>
        </ActiveSectionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
