-- 0011_quiz_max_attempts_trigger.sql
--
-- Server-side enforcement of quiz max_attempts.
-- Prevents students from bypassing the client-side check via direct API inserts.

create or replace function public.enforce_quiz_max_attempts()
returns trigger language plpgsql as $$
declare
  _max int;
  _used int;
begin
  select max_attempts into _max
    from public.quizzes
    where id = NEW.quiz_id;

  select count(*) into _used
    from public.quiz_attempts
    where quiz_id = NEW.quiz_id
      and user_id = NEW.user_id;

  if _used >= _max then
    raise exception 'Maximum attempts (%) reached for this quiz', _max
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_quiz_max_attempts on public.quiz_attempts;
create trigger trg_enforce_quiz_max_attempts
  before insert on public.quiz_attempts
  for each row execute function public.enforce_quiz_max_attempts();
