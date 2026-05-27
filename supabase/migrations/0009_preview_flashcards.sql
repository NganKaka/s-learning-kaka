-- Migration 0009: public read of flashcards on preview lessons
-- The 0001 policy "flashcards: read if enrolled" hid every card from
-- visitors. We want the free preview lesson to expose its sample cards
-- so prospects can try the SRS deck before signing up.
--
-- Adds a second SELECT policy: anyone (anon or authenticated) can read
-- flashcards whose parent lesson is is_preview=true AND parent course
-- is published. RLS combines policies with OR, so enrolled users still
-- see all cards via the existing policy.

drop policy if exists "flashcards: public read on preview lessons" on public.flashcards;
create policy "flashcards: public read on preview lessons"
  on public.flashcards for select
  using (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = flashcards.lesson_id
        and l.is_preview = true
        and c.status = 'published'
    )
  );
