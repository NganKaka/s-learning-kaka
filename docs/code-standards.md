# Code Standards

Living conventions for the sLearningKaka codebase. Keep this short and current.

## Tooling & quality gates

| Concern | Tool | Command |
|---|---|---|
| Types | TypeScript (strict) | `npm run typecheck` |
| Lint | ESLint 9 (flat config) | `npm run lint` |
| Format | Prettier | `npm run format` |
| Unit tests | Vitest + Testing Library | `npm run test` / `npm run test:coverage` |
| E2E | Playwright (not in CI) | `npx playwright test` |
| Pre-commit | husky + lint-staged | auto on `git commit` |
| CI | GitHub Actions | typecheck → lint → test → build |

- ESLint runs over `src/` and `api/`. `any` and unused vars are **warnings**, not errors (pragmatic baseline; tighten over time). Keep error count at **0**.
- Prettier config: single quotes, semicolons, trailing commas, 100 print width, 2-space indent.
- Unit tests live next to code as `*.test.ts`. Pure logic is tested directly; DB-coupled functions use the shared mock at `src/test/supabase-mock.ts`.

## File naming

- **`src/lib/` modules: camelCase**, matching the existing majority (`mistakeNotebook.ts`, `studyGoals.ts`, `videoChapters.ts`, `certificatePdf.ts`). One responsibility per module; name it after that responsibility.
  - This is a deliberate, documented choice — **do not retro-rename** existing single-word modules (`quiz.ts`, `wallet.ts`, `srs.ts`); churn would destroy `git blame` for no functional gain.
- **React components: PascalCase** `.tsx` (`SiteNavbar.tsx`, `CourseCard.tsx`). Components belong in `src/components/`, never in `src/lib/`.
- Avoid grab-bag/ambiguous names (`extras.ts`, `duplicate.ts`). Prefer a name that says what the module does.

## Module size

- Target **< 200 LOC** per file. Split larger files into focused sub-components and hooks (see Phase 5 of the professional-refactor plan for the decomposition pattern).

## Data access

- Supabase access is wrapped in `src/lib/*` modules — components don't call `supabase` directly except in page-level effects.
- Lib read functions should surface (not silently swallow) Supabase errors. The hook-based modules (`courses.ts`, `orders.ts`) set an `error` state; plain async readers can use `unwrap()` from `src/lib/db.ts` to log the error and fall back to a default.
- Prefer the shared `useAsyncData` hook (`src/hooks/useAsyncData.ts`) for component fetch/loading/error state over hand-rolled `useState` + `useEffect` + `cancelled` flags. Reuse the single `AsyncState<T>` from `src/types/common.ts` — don't redefine it.

### Follow-up: `useAsyncData` migration

`useAsyncData` adoption was started (`StudentAnnouncements`, `LessonCards`). ~20 components/pages still hand-roll the fetch pattern. Single-value fetches migrate cleanly; multi-value pages (`Dashboard`, `Cart`, `Learn`, most `Teacher*`) fetch several values per effect and need light restructuring first. Migrate incrementally, verifying each against e2e (behavior-preserving).

## UI primitives

Shared presentational primitives live in `src/components/ui/`. Prefer these over re-inlining one-off Tailwind strings — they encode the brand vocabulary once (no new colors/fonts; tokens from `src/index.css`).

- **`Button`** — variants `primary` (gold CTA) · `secondary` (cyan) · `ghost` · `danger` (red); sizes `sm`/`md`; `loading` disables + spinner + `aria-busy`; defaults `type="button"`. Consolidates the repeated `border-primary/40 bg-primary/15 … font-tech uppercase` CTA pattern.
- **`Badge`** — tones `success` · `warning` · `info` · `neutral`; sizes `sm`/`md`. For status pills (e.g. the cyan "Đã đăng ký" → `tone="info"`).
- **`EmptyState`** — `icon?` / `title` / `description?` / `action?`. Replaces ad-hoc `return null` empty blocks.
- **`ErrorAlert`** — `message` + optional `onRetry`; `role="alert"`. Replaces the duplicated `border-red-400/30 bg-red-500/5 … text-red-300` inline error.

**Conventions baked in:** brand tokens only; `className` is appended (not overridden) for one-off tweaks; decorative icons are `aria-hidden`. Adopt incrementally on touched pages — don't sweep teacher/admin in one pass. No `Modal`/`Dialog` primitive yet (YAGNI — add when a real need appears).

## Certificate fonts

`certificatePdf.ts` embeds **Be Vietnam Pro** (a Unicode TTF covering Vietnamese) via `@pdf-lib/fontkit`, loaded lazily from `/public/fonts/` (`certificateFonts.ts`). This fixed a prior crash where standard WinAnsi Helvetica could not encode Vietnamese diacritics (`ễ`, `ữ`). If the font fails to load, it falls back to Helvetica (ASCII-only) so Latin names still render offline. Regression-tested in `certificatePdf.test.ts`.
