/**
 * Database row types — kept in sync by hand for now. Once we settle on
 * the schema, can be regenerated with `supabase gen types typescript`.
 */

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';
export type EnrollmentStatus = 'active' | 'revoked' | 'expired';
export type PaymentMethod = 'vietqr_vcb' | 'vietqr_momo' | 'manual' | 'free' | 'wallet';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_instructor: boolean;
  wallet_balance_vnd: number;
  created_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image: string | null;
  price_vnd: number;
  level: CourseLevel;
  duration_minutes: number;
  instructor_id: string | null;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  slug: string;
  title: string;
  description: string | null;
  bunny_video_id: string | null;
  duration_seconds: number;
  order_index: number;
  is_preview: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  course_id: string | null;
  amount_vnd: number;
  payment_method: PaymentMethod;
  memo_code: string;
  status: OrderStatus;
  kind: 'purchase' | 'topup';
  confirmed_at: string | null;
  confirmed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  order_id: string | null;
  status: EnrollmentStatus;
  granted_at: string;
  expires_at: string | null;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  last_position_seconds: number;
  completed_at: string | null;
  updated_at: string;
}

/** Course + modules + lessons, fetched together for course detail / learn pages. */
export interface CourseWithCurriculum extends Course {
  modules: Array<Module & { lessons: Lesson[] }>;
  instructor: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
}
