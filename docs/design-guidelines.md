# Design Guidelines

Single-source conventions for sLearningKaka UI. Cross-referenced from `code-standards.md`.

---

## Brand Tokens

Defined in `src/index.css` via `@theme`. Use these — never hard-code hex values in components.

| Token | Value | Use |
|---|---|---|
| `--color-primary` / `text-primary` | `#e9c349` (gold) | Primary CTAs, headings accent, progress indicators |
| `--color-background` | near-black | Page background |
| `--color-on-surface` | off-white | Body text, headings |
| `--color-secondary` | muted white | Secondary / helper text (pair with `/55`–`/85` opacity) |
| `--font-headline` | display font | `font-headline` — page titles, card headings |
| `--font-tech` | monospace/tech | `font-tech` — labels, caps, meta, counters |

Do not introduce new colors or fonts. Cyan (`cyan-300`/`cyan-400`) and amber (`amber-400`) are accent tones only — never use as semantic success/error.

---

## Phase-1 UI Primitives

Live in `src/components/ui/`. Adopt on all student pages; do not re-inline their Tailwind strings.

### `Button`
- Variants: `primary` (gold CTA) · `secondary` (cyan) · `ghost` · `danger` (red)
- Sizes: `sm` / `md` (default `md`)
- Use `loading` prop for async actions — adds spinner + `aria-busy`, disables button
- Defaults to `type="button"` — safe in forms
- When to use: any clickable action that isn't a navigation link

### `Badge`
- Tones: `success` · `warning` · `info` · `neutral`
- Sizes: `sm` / `md`
- Use for status pills (enrolled, preview, locked). Non-interactive — never wrap in `<button>`
- `icon` prop for leading icon (keep `aria-hidden` on the icon itself)

### `EmptyState`
- Props: `icon?` / `title` / `description?` / `action?`
- Replaces all ad-hoc `return null` / bare-text empty blocks
- Single consistent affordance when a list is empty

### `ErrorAlert`
- Props: `message` + optional `onRetry`; renders `role="alert"`
- Replaces the repeated `border-red-400/30 bg-red-500/5 text-red-300` inline error pattern
- Always shown after a failed fetch, never silently swallowed

---

## Spacing & Layout Conventions

- Card padding: `p-5` (compact) or `p-6`/`p-8` (detailed sections)
- Gap between cards: `gap-4` (dense) / `gap-5`–`gap-6` (spacious)
- Section spacing: `mt-8`–`mt-10` between major sections on a page
- Glass surface: `glass-card rounded-2xl` (standard) or `rounded-3xl` (large hero cards)

---

## Hover & Interaction Tone

- Primary hover: `hover:bg-primary/15` + `hover:border-primary/40`
- Cyan hover: `hover:bg-cyan-400/20` + `hover:border-cyan-300/35`
- Ghost: `hover:bg-white/[0.03]`
- Transitions: `transition-colors` (color-only) or `transition-all duration-300` (scale + shadow)
- Scale on card hover: `group-hover:scale-105` — images only, not whole cards

---

## Responsive Rules

### Mobile guards for decoration
Decorative GPU effects are hidden or disabled on small/touch screens to preserve battery and prevent overflow:

| Component | Guard strategy |
|---|---|
| `MeshGradient` | `hidden sm:block` — not rendered on `<sm` |
| `CursorTrail` | Early return when `ontouchstart`, `pointer:coarse`, or `prefers-reduced-motion` |
| `Spotlight` | Same early-return triple-guard as CursorTrail |
| `ScrollVignette` | Early return when `prefers-reduced-motion` |
| `FilmGrain` | Static SVG — no guard needed (~0 cost) |

Desktop (≥`sm`, pointer device, motion allowed) renders identically to the pre-guard state.

### Text minimums
- Body / label text: **≥ 11px** (`text-[11px]` minimum). Pure micro-labels inside a card that convey no standalone meaning (e.g. "Mặt trước" on a flip card) may stay at `text-[10px]` if they are supplementary to larger text.
- Interactive text (links, buttons, nav): **≥ 11px** without exception.

### Touch targets
- All interactive elements: **≥ 40 × 40 px**. Use `min-h-[44px]` on buttons or `py-3 px-4` minimum.
- For small icon-only controls add `p-2` padding or a `w-10 h-10` wrapper.

### Breakpoints used
- `sm` (640px): desktop guard boundary for decorative effects
- `md` (768px): two-column grids, larger font steps
- `lg` (1024px): sidebar + main-content split layouts

---

## Skeleton Loading Convention

Replace `return null` / blank-pulse loading with `Skeleton*` components from `src/components/ui/Skeleton.tsx` shaped like the loaded content.

| Component | Use for |
|---|---|
| `SkeletonCard` | Card-shaped placeholder (title + subtitle + body area) |
| `SkeletonLine` | Single text line (pass `width` prop) |
| `SkeletonAvatar` | Circular avatar placeholder |
| `SkeletonTable` | Row-list data tables |

Keep skeletons in the same grid/layout as loaded state to minimise CLS.

---

## Accessibility Conventions

- **Semantic controls**: use `<button>` for actions, `<a>`/`<Link>` for navigation. Never `<div onClick>`.
- **`aria-pressed`**: required on toggle buttons (e.g. filter pills, flip card) to convey current state.
- **`aria-expanded`**: required on accordion / collapsible triggers (e.g. module panels in curriculum).
- **Non-color cues**: accompany color-coded states with a glyph or text label (e.g. rating buttons use `✗`/`△`/`✓`/`✓✓` glyphs alongside colors).
- **`aria-live`**: wrap async status messages (submission result, loading completion) in a live region — `aria-live="polite"` for non-urgent, `aria-live="assertive"` for errors.
- **`aria-hidden`**: decorative icons, glyphs, and illustration elements must be `aria-hidden="true"`.
- **Focus ring**: use `focus-visible:ring-2 focus-visible:ring-cyan-300/70` — never suppress `:focus-visible`.
- **Contrast**: primary gold `#e9c349` on near-black background passes WCAG AA at body sizes. Muted secondary text at `/55` opacity is decorative; ensure nearby full-opacity text carries the meaning.
