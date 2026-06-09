# Professional Refactor: Behavior-Preserving Codebase Hardening

**Date**: 2026-06-09 10:54  
**Severity**: Medium  
**Component**: Codebase infrastructure, quality gates, component structure  
**Status**: Completed (9 commits, unpushed; live smoke test pending)

## What Happened

Executed a 5-phase behavior-preserving refactor on sLearningKaka (React 19 + TS + Vite SPA) via `/ck:cook` against a disciplined plan. Delivered 9 commits (8e24930..ca55a2f) on `main`: installed quality tooling (ESLint 9, Prettier, Vitest), built a regression safety net (51 unit tests for core lib), deleted 19 dead lib modules (−1553 LOC) + misplaced component, standardized error handling and async patterns, decomposed three oversized components, and fixed a latent production bug (Vietnamese diacritics in certificate PDFs). All gates green at every step (typecheck/lint/test/build). Not pushed (HTTPS auth unavailable in environment).

## The Brutal Truth

This refactor was a _relief_. The codebase had zero professional tooling despite being a real-world EdTech platform serving Vietnamese students — no linting, no unit tests, no CI, no pre-commit hooks. Dead code accumulated silently from earlier batch commits. The largest components (LessonQuiz at 821 LOC) were untested monoliths ripe for regression. Worst part: the regression net itself caught a genuine production bug that would've escaped to users — Vietnamese names with diacritics (ễ, ữ) crashed PDF generation because WinAnsi Helvetica can't encode them, on a _Vietnamese learning platform_. That's humbling.

The refactor also exposed a design choice that haunts the codebase: most lib functions swallow Supabase errors silently (`data ?? []`), making debugging silent failures invisible. The `quiz.ts` module was a particular offender. We fixed the most egregious silent spots, but the pattern persists in ~20% of the codebase as documented follow-up work.

## Technical Details

**Commits (commits 1–9):**
1. `8e24930` — ESLint 9 flat config, Prettier, Vitest+jsdom+Testing Library, husky+lint-staged, GitHub Actions CI (typecheck→lint→test→build pipeline).
2. `2be9fcc` — Fixed 5 pre-existing lint errors: conditional React hook in TeacherStudents, no-op self-assign in srs.ts, stale closure in two files. Prettier normalization isolated.
3. `b348d8f` — 51 unit tests for SM-2 SRS, quiz grading/aggregation, date helpers, XP streak, certificate PDF generation. Reusable Supabase mock (src/test/supabase-mock.ts). Per-file coverage ratchets, no global floor.
4. `3b06508` — Deleted 19 unused src/lib modules (−1553 LOC), FadeInImage.tsx. Renamed certificate.ts→certificatePdf.ts (collided with grep for certificates.ts data layer).
5. `393c5b3` — Added unwrap() error-surfacing helper in src/lib/db.ts; applied to silent quiz.ts reads. Adopted useAsyncData in 2 clean components. Killed the last `any` in AIQuestionGenerator.tsx. DRY'd duplicate AsyncState type.
6. `609353b` — SiteNavbar: 424→151 LOC (11 sub-component/hook files, all <200 LOC).
7. `fbc01cf` — QuizConfigEditor (621→194 LOC) + LessonQuiz (821→147 LOC) decomposed by parallel fullstack-developer subagents (distinct file dirs, zero conflicts).
8. `d657c77` — **Bonus fix:** Certificate PDF generation crashed on Vietnamese diacritics because Helvetica is WinAnsi-only. Embedded Be Vietnam Pro Unicode TTF via @pdf-lib/fontkit (bundled in public/fonts/). Graceful fallback to Helvetica if font load fails.
9. `ca55a2f` — Fix: Restored timeout info-toast ("Hết giờ. Bài làm được nộp tự động.") dropped in LessonQuiz decomposition. Code-reviewer caught this regression.

**Lint/test/build status:** All green.  
- TypeScript: 0 errors.
- ESLint: 0 errors (fixed 5 pre-existing).
- Vitest: 51 tests, 0 failures.
- Build: succeeds, no warnings.

## What We Tried

1. **Global test coverage floor:** Too blunt (passing tests in untested modules masked real gaps). Switched to per-file ratchets — more honest.
2. **Decompose all oversized components simultaneously:** Caused coordination overhead with two subagents. Kept distinct dirs, split by file ownership. Worked, but adversarial code-review proved essential for detecting regressions (see below).
3. **Silent error-swallowing fix as Phase 4 focus:** Found that courses.ts/orders.ts already handled errors well; only quiz.ts was genuinely silent. Right-sized to unwrap() + 2 clean useAsyncData migrations. Remaining ~20 component migrations deferred with clear docs.

## Root Cause Analysis

The refactor succeeded because we:
1. **Prioritized gates (Phase 1) before structural changes.** Every later commit was lint+test+CI-protected, making regressions visible immediately.
2. **Built a regression safety net (Phase 2) before touching code.** The tests discovered the Vietnamese diacritics bug — proving the safety-net-first discipline works.
3. **Enforced code ownership (parallel decomposition).** Two subagents in distinct file dirs eliminated merge conflicts.
4. **Did not try to refactor without runtime verification availability.** Honest constraint: no Supabase env, no live e2e. Compensated with static analysis (lint rules for hooks), build verification, and adversarial code-review.

The timed-quiz regression (timeout toast dropped) happened because:
- LessonQuiz was 821 LOC: complex state machine for quiz timer, submission, grading.
- Decomposition broke the component into ~7 sub-components to reason about each piece.
- One toast notification (async side-effect on timer expiry) was moved to a sub-component but the async dependency list was incomplete.
- Code-reviewer caught it because they re-read the original behavior spec and noticed the toast was gone.

## Lessons Learned

1. **Tests-first on refactors is not ceremony — it's a bug detector.** The regression net caught a real production crash (Vietnamese names) that would've shipped silently.

2. **Adversarial code-review is essential for delegated refactors of stateful components.** When you can't run the app or e2e tests, a reviewer who knows the original behavior becomes your safety rail. The timeout toast regression would've shipped without this.

3. **Silent error-swallowing is a design pattern in this codebase, not a bug.** Most lib functions follow `data ?? []`, which makes sense for read-heavy queries but masks unexpected failures in mutation paths (quiz submissions). Document the boundary; don't try to fix everything at once.

4. **Component size correlates with refactor risk.** The oversized components (LessonQuiz 821 LOC) had more subtle state interactions than smaller ones. Decomposition reduced per-component cognitive load from 821 to ~150 LOC, making bugs more visible.

5. **Per-file test coverage ratchets > global floor.** Global "80% coverage" is meaningless if untested files slip through. Per-file ratchets (e.g., "lib/srs.ts must have >90%") force explicit decisions about what stays untested.

6. **Scope discipline prevents rewrites.** Phase 4 was originally "fix all error-swallowing," but analysis showed only ~20% of the codebase genuinely needed it. Right-sizing to unwrap() + 2 useAsyncData migrations kept the refactor focused and shippable.

## Next Steps

1. **User to push 9 commits** — HTTPS auth unavailable in this environment. `git push origin main`.

2. **Live smoke test of timed-quiz auto-submit + Vietnamese certificate download** — No Supabase env here, so runtime verification still pending. High priority: verify the timeout toast fires and certificate PDFs render without crashes.

3. **Follow-up refactor batch (documented in docs/code-standards.md):**
   - ~20 remaining useAsyncData migrations (components still using useState+useEffect+cancelled flag).
   - ~21 files still exceeding 200 LOC (Wallet, Cart, Learn, CourseDetail, etc.).
   - Continue decomposition by component, not by file size (LessonQuiz's 7 sub-files were driven by behavioral state, not arbitrary 200-LOC splits).

4. **Certificate fallback robustness** — If webfont fetch fails offline AND name has diacritics, the fallback re-exposes the crash. Acceptable (no worse than before), but future guard could transliterate diacritics to ASCII if font fails. Low priority.

5. **Path alias `@/*` deferred** — Plan suggested it; not urgent. Kept camelCase lib naming (no retro-rename, respects user decision).

## Unresolved Questions

- 9 commits unpushed (HTTPS auth unavailable). Who pushes to origin?
- Live smoke test of timed-quiz auto-submit + Vietnamese certificate download still pending (no Supabase env in this session).
- Should the ~20 remaining useAsyncData migrations be a sprint backlog item, or deferred further?
- Certificate fallback behavior (diacritics→crash if offline): acceptable as-is, or add transliteration guard now?
- Follow-up: should oversized files (Wallet, Cart, etc.) be decomposed in next refactor cycle, or left alone?
