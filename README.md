# sLearningKaka

Vietnamese-language learning platform for high-school students. Single-instructor MVP launching with **Toán 12** (Math, grade 12), taught by Vo Hoang Ngan. Students watch structured video lessons, drill flashcards with spaced repetition, take end-of-lesson quizzes, and earn a completion certificate.

Live: https://s-learning-kaka.vercel.app

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite 6, React Router 7 |
| Styling | Tailwind CSS 4 (Vite plugin), Framer Motion, GSAP, Lenis smooth scroll |
| Backend (data + auth) | Supabase (Postgres + RLS + Auth + OAuth) |
| Backend (server fns) | Vercel serverless functions (`/api/*`) |
| Video hosting | Bunny Stream (iframe embed) |
| Email | Resend |
| Payments | VietQR (Vietcombank), MoMo manual transfer, internal wallet |
| PDF | `pdf-lib` (client-side certificate generation) |
| Analytics | Plausible |
| Hosting | Vercel (SPA rewrite via `vercel.json`) |

---

## Features

**Student**
- Browse catalog, view course detail with curriculum, level, duration, instructor.
- Sign up / sign in with email + password or Google OAuth. "Remember me" toggles localStorage vs sessionStorage.
- Pay by VietQR (auto-filled QR with amount + memo) or top up an internal wallet first and pay from balance.
- Watch lessons through Bunny Stream embeds; progress persisted per-lesson.
- Flashcards with SM-2 spaced repetition (`src/lib/srs.ts`), per-card review queue across all enrolled courses.
- End-of-lesson quizzes (single, multi, text).
- Generate a PDF completion certificate once every lesson in a course is done.
- Welcome email on first sign-in (idempotent via `user_metadata.welcome_sent_at`).
- Receipt email on order approval.
- Announcements feed from the instructor on the dashboard.

**Instructor (`/teacher/*`)**
- Approve pending orders → creates enrollment (purchase) or credits wallet (top-up).
- Revenue dashboard.
- Course editor (modules + lessons + flashcards + quizzes).
- Student roster.
- Post pinned/unpinned announcements to all enrolled students.

**Polish**
- Route transitions, scroll progress bar, scroll vignette, film grain, cursor trail, command palette, theme toggle.
- Per-page OG metadata via `DocumentHead` for sharable links.
- Image optimization at build time (`vite-plugin-image-optimizer`).

---

## Project layout

```
.
├── api/                          # Vercel serverless functions
│   ├── checkout/wallet.ts        # Pay for a course from wallet balance (atomic debit + enroll)
│   ├── notify/welcome.ts         # Send welcome email; idempotent via user_metadata
│   └── orders/approve.ts         # Instructor approves order → enroll or credit wallet, send receipt
├── public/
│   └── og.png                    # Social share image
├── src/
│   ├── App.tsx                   # Router + global UI shells
│   ├── main.tsx                  # ThemeProvider → ToastProvider → AuthProvider → App
│   ├── components/               # 30+ reusable UI pieces (PageShell, SiteNavbar, ReceiptUpload, …)
│   ├── contexts/                 # Auth, Theme, Toast, ActiveSection
│   ├── data/                     # Static content (profile)
│   ├── hooks/                    # useBackToTop, …
│   ├── lib/                      # supabase client, courses, orders, wallet, srs, certificate, welcome
│   ├── pages/                    # Home, Courses, CourseDetail, Learn, Dashboard, Cards, Login, Signup,
│   │                             # Cart, Account, Wallet, Teacher (+ 5 sub-pages)
│   └── index.css
├── supabase/
│   ├── migrations/               # 0001 init → 0008 announcements (run in order in SQL editor)
│   └── seed/math-12.sql          # Launch course content
├── index.html                    # Title, OG/Twitter meta, Plausible script, fonts preconnect
├── vite.config.ts                # React + Tailwind + image optimizer + manualChunks
├── vercel.json                   # SPA rewrite (anything not /api → /index.html)
└── package.json
```

---

## Database

Schema lives in `supabase/migrations/`, applied in numbered order:

| # | Adds |
|---|---|
| 0001 | Core tables — `profiles`, `courses`, `modules`, `lessons`, `orders`, `enrollments`, `lesson_progress`, `flashcards`, `card_reviews`, `quizzes`, `quiz_questions`, `quiz_attempts` + RLS policies + `handle_new_user` trigger |
| 0002 | Instructor RLS to read orders + student profiles for their courses |
| 0003 | Catalog query indexes (level, instructor, enrollment lookups) |
| 0004 | Wallet — `wallet_balance_vnd` on profiles, `wallet_transactions` ledger, `wallet_credit` / `wallet_debit` SECURITY DEFINER RPCs, `kind='topup'` on orders |
| 0005 | Instructor visibility into top-up orders |
| 0006 | Fix profiles RLS recursion via `is_instructor_uid()` SECURITY DEFINER helper |
| 0007 | Break orders ↔ profiles mutual recursion using same helper |
| 0008 | Announcements (instructor-write, enrolled-students-read + public read for instructors with published courses) |

Wallet writes go through service-role RPC only — `wallet_credit`/`wallet_debit` are revoked from `anon` and `authenticated`. The Vercel functions are the only callers.

---

## Auth & RLS notes

- Auth is Supabase email/password + Google OAuth.
- Sessions persist in localStorage by default; "Remember me" off migrates them to sessionStorage (see `src/lib/supabase.ts`).
- All tables have RLS on. Public reads only for `courses.status = 'published'` and preview lessons. Everything else is gated by ownership or active enrollment.
- Instructor approval of orders bypasses RLS via the service-role key in `/api/orders/approve.ts`, but still authorizes the caller's `auth.uid()` against `profiles.is_instructor`.

---

## Payments

Two flows, both manual-confirmation by design (no payment gateway integration yet):

1. **Direct course purchase** — student picks Vietcombank or MoMo at checkout. We render a VietQR.io image with amount + unique memo code pre-filled. Student transfers, uploads a receipt screenshot, instructor verifies in `/teacher` and clicks Approve → `/api/orders/approve` upserts the enrollment and emails the receipt.
2. **Wallet top-up** — same QR flow but `orders.kind='topup'`. Approval calls `wallet_credit` RPC instead of creating an enrollment. Student then buys courses from balance via `/api/checkout/wallet`, which atomically debits and enrolls.

Memo codes are unique per order so the instructor can match transfers to the right buyer.

---

## Local development

```powershell
# Install
npm install

# Configure
Copy-Item .env.example .env.local
# Fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VietQR account info,
# VITE_BUNNY_STREAM_LIBRARY_ID. Server-only keys (SERVICE_ROLE, RESEND_API_KEY)
# are needed only when running Vercel functions locally.

# Run dev server (port 3001, host 0.0.0.0)
npm run dev

# Type check
npm run lint    # tsc --noEmit

# Production build
npm run build
npm run preview
```

### Bringing up Supabase

1. Create a Supabase project, copy URL + anon key into `.env.local`.
2. Open SQL editor, run `supabase/migrations/0001_init.sql` … `0008_announcements.sql` in order.
3. Sign up your instructor account via `/signup`, copy the user id from `auth.users`.
4. Edit `supabase/seed/math-12.sql` — replace the `<INSTRUCTOR_USER_ID>` placeholder with that uuid, then run it.
5. Configure Google OAuth in Supabase Auth → Providers (optional).

### Vercel functions locally

The `/api/*` handlers need `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `BUNNY_STREAM_API_KEY`. Run with `vercel dev` if you want them live.

---

## Deployment

Deployed on Vercel. `vercel.json` rewrites everything outside `/api/` to `/index.html` so client-side routing works on hard refresh / deep links. Set the same env vars from `.env.example` in Vercel project settings (server-only keys without the `VITE_` prefix are not exposed to the bundle).

---

## Conventions

- TypeScript strict mode on; no `any` outside narrow Supabase row casts.
- Database row types hand-maintained in `src/lib/database.types.ts` (regen with `supabase gen types typescript` once schema stabilizes).
- Vietnamese is the user-facing language; English is fine for code, comments, commit messages.
- Migrations are numbered and append-only — fix forward, never edit a merged migration.
