# API Documentation

## Authentication
All API routes require authentication via Supabase session (Bearer token in Authorization header) unless noted.

---

## POST /api/orders/approve
**Auth:** Instructor only (service-role)
**Body:** `{ orderId: string }`
**Response:** `{ success: true }` or `{ error: string }`
**Effect:** Approves order → creates enrollment or credits wallet.

---

## POST /api/checkout/wallet
**Auth:** Authenticated user
**Body:** `{ courseId: string }`
**Response:** `{ success: true }` or `{ error: string }`
**Effect:** Debit wallet + create enrollment atomically.

---

## POST /api/notify/welcome
**Auth:** Authenticated user
**Body:** `{}`
**Response:** `{ sent: boolean }`
**Effect:** Sends welcome email (idempotent).

---

## POST /api/notify/weekly-report
**Auth:** Cron (x-cron-secret header)
**Body:** `{}`
**Response:** `{ sent: number }`
**Effect:** Sends weekly progress email to all parents with notify_email=true.

---

## POST /api/notify/parent-alert
**Auth:** Cron or authenticated
**Body:** `{ type: 'quiz_submit' | 'inactivity_check', studentId?, score?, quizTitle? }`
**Response:** `{ sent: number }`

---

## POST /api/ai/generate-questions
**Auth:** Authenticated (teacher)
**Body:** `{ content: string, count?: number, language?: 'vi' | 'en' }`
**Response:** `{ questions: [{ prompt, choices, correct, explanation }] }`
**Requires:** OPENAI_API_KEY env var.

---

## POST /api/cron/publish-announcements
**Auth:** Cron (x-cron-secret header)
**Response:** `{ published: number }`
**Effect:** Publishes scheduled announcements whose time has passed.

---

## POST /api/cron/email-drip
**Auth:** Cron (x-cron-secret header)
**Response:** `{ sent: number }`
**Effect:** Sends contextual drip emails (day 3, 7, 14 after signup).

---

## Environment Variables

| Key | Required | Used by |
|-----|----------|---------|
| VITE_SUPABASE_URL | Yes | Client |
| VITE_SUPABASE_ANON_KEY | Yes | Client |
| SUPABASE_SERVICE_ROLE_KEY | Yes | API routes |
| RESEND_API_KEY | Yes | Email sending |
| OPENAI_API_KEY | Optional | AI question gen |
| CRON_SECRET | Yes | Cron auth |
| VITE_UPSTASH_REDIS_REST_URL | Optional | Caching |
| VITE_UPSTASH_REDIS_REST_TOKEN | Optional | Caching |
| VITE_PUBLIC_SITE_URL | Optional | Email links |
