-- 0016_quiz_image_type.sql
--
-- Add 'image' question type and image_url column.

alter table public.quiz_questions
  add column if not exists image_url text;

alter table public.quiz_questions
  drop constraint if exists quiz_questions_type_check;
alter table public.quiz_questions
  add constraint quiz_questions_type_check
  check (type in ('single', 'multi', 'text', 'file', 'image'));
