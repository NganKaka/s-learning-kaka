# Journal — Quiz Session Dedicated Page

**Date:** 2026-06-09
**Plan:** `plans/260609-1444-quiz-dedicated-page/`
**Commits:** `5498cc2`, `8716393`, `d3a6e81`, `d087d07` (4)
**Outcome:** Done · 72/72 tests · typecheck/lint/build green

## Goal

Move the lesson quiz from an inline block at the bottom of `Learn.tsx` to a **dedicated, focused route** `/learn/:courseSlug/:lessonSlug/quiz`. Lesson now shows a compact entry card (questions · time · attempts · score); clicking it navigates to a full-screen quiz (no navbar/footer) that runs the existing start → active → result flow.

## Decisions (with the user)

- **New route**, navigate-away (shareable, back-button returns to lesson) — not an overlay.
- **Focused mode**: quiz page omits `PageShell`, so no navbar/footer. Chrome is opt-in here, so "hide chrome" = "don't wrap in PageShell" — no global navbar to fight.
- **Reuse, don't rebuild**: the quiz engine (`LessonQuiz`, `useQuizSession`, `useQuizTimer`, `QuizStartScreen`, `QuizActiveView`) stayed untouched. New surface = route + focused page wrapper + access hook + entry card.

## What shipped

- `useLessonAccess(courseSlug, lessonSlug)` — minimal-query access resolution for lightweight consumers, plus a pure `canPlayLesson(lesson, enrolled)` helper.
- `Quiz.tsx` — focused page; guards anon→login, locked→lesson, missing→courses; no-quiz EmptyState; back-link hidden during an active attempt.
- `LessonQuiz` gained two **optional** callbacks (`onAttemptActiveChange`, `onLoaded`) — no behavior change when omitted.
- `QuizEntryCard` — replaces the inline quiz in the lesson; renders nothing when no quiz.
- 9 tests: access-guard matrix (incl. explicit `locked`/no-bypass) + card states.

## Key deviation (and why)

The plan said "refactor Learn to consume the access hook." Reading Learn's loader showed it **bundles** course + modules + all-lessons + enrollment in one efficient pass (it needs all lessons for nav). Routing that through a minimal access hook would have **added round-trips and double-fetched the lesson** — making the just-polished page worse. So I shared only the part that actually matters for security — the decision `canPlayLesson` — used by both Learn (one-line swap, behavior-identical) and the hook. DRY on the guard, zero regression risk to Learn's loader. An explicit `locked` test asserts a direct URL can't bypass enrollment.

## Notes / follow-ups

- The dedicated route enforces the same enrollment guard as the lesson; RLS on `quizzes`/`quiz_attempts` remains the server backstop.
- A hard navigation-blocker for mid-attempt leaves was left out (YAGNI); the back link is just hidden during an active attempt + existing tab-switch detection covers integrity.
- **Unverified here** (no seeded data / login in this environment): the live click-through — focused page render, full attempt + result, direct-URL bypass attempt, no-quiz empty state. Recommended manual QA before relying on it.
