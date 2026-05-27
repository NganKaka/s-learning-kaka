import { supabase } from './supabase';

export interface ParentLink {
  id: string;
  parent_id: string;
  enrollment_id: string;
  tracking_code: string;
  linked_at: string;
}

export interface LinkedStudent {
  link: ParentLink;
  student_name: string | null;
  course_title: string;
  course_id: string;
  student_id: string;
}

export interface StudentScore {
  quiz_id: string;
  quiz_title: string | null;
  lesson_title: string;
  attempt_number: number;
  auto_score: number | null;
  final_score: number | null;
  submitted_at: string | null;
}

export async function linkCode(parentId: string, code: string): Promise<{ error?: string }> {
  // Find enrollment by tracking_code
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('tracking_code', code)
    .maybeSingle();

  if (!enrollment) return { error: 'Mã theo dõi không hợp lệ.' };

  // Check if already linked
  const { data: existing } = await supabase
    .from('parent_links')
    .select('id')
    .eq('enrollment_id', enrollment.id)
    .maybeSingle();

  if (existing) return { error: 'Mã này đã được liên kết.' };

  const { error } = await supabase.from('parent_links').insert({
    parent_id: parentId,
    enrollment_id: enrollment.id,
    tracking_code: code,
  });

  if (error) return { error: error.message };
  return {};
}

export async function getLinkedStudents(parentId: string): Promise<LinkedStudent[]> {
  const { data: links } = await supabase
    .from('parent_links')
    .select('*')
    .eq('parent_id', parentId);

  if (!links || links.length === 0) return [];

  const enrollmentIds = links.map((l) => l.enrollment_id);
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id')
    .in('id', enrollmentIds);

  if (!enrollments) return [];

  const userIds = [...new Set(enrollments.map((e) => e.user_id))];
  const courseIds = [...new Set(enrollments.map((e) => e.course_id))];

  const [{ data: profiles }, { data: courses }] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', userIds),
    supabase.from('courses').select('id, title').in('id', courseIds),
  ]);

  return links.map((link) => {
    const enrollment = enrollments.find((e) => e.id === link.enrollment_id);
    if (!enrollment) return null;
    const profile = profiles?.find((p) => p.id === enrollment.user_id);
    const course = courses?.find((c) => c.id === enrollment.course_id);
    return {
      link: link as ParentLink,
      student_name: profile?.display_name ?? null,
      course_title: course?.title ?? 'Khoá học',
      course_id: enrollment.course_id,
      student_id: enrollment.user_id,
    };
  }).filter(Boolean) as LinkedStudent[];
}

export async function getStudentScores(
  studentId: string,
  courseId: string,
): Promise<StudentScore[]> {
  // Get all lessons in course
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title')
    .eq('course_id', courseId);

  if (!lessons || lessons.length === 0) return [];

  const lessonIds = lessons.map((l) => l.id);

  // Get quizzes for those lessons
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, lesson_id')
    .in('lesson_id', lessonIds);

  if (!quizzes || quizzes.length === 0) return [];

  const quizIds = quizzes.map((q) => q.id);

  // Get attempts by this student
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('quiz_id, attempt_number, auto_score, final_score, submitted_at')
    .eq('user_id', studentId)
    .in('quiz_id', quizIds)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: true });

  if (!attempts) return [];

  return attempts.map((a) => {
    const quiz = quizzes.find((q) => q.id === a.quiz_id)!;
    const lesson = lessons.find((l) => l.id === quiz.lesson_id)!;
    return {
      quiz_id: a.quiz_id,
      quiz_title: quiz.title,
      lesson_title: lesson.title,
      attempt_number: a.attempt_number,
      auto_score: a.auto_score,
      final_score: a.final_score,
      submitted_at: a.submitted_at,
    };
  });
}
