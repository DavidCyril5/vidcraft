# VidCraft AI

A futuristic AI video generation platform with full auth, monetization, and 4 neural models.

## Run & Operate

- `pnpm --filter @workspace/vidcraft-ai run dev` — frontend (port 24006)
- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + wouter routing
- API: Express 5 + Helmet + rate limiting
- Auth: JWT (httpOnly cookies) + bcrypt
- DB: MongoDB via Mongoose (Atlas)
- Payments: Paystack (Naira ₦)

## Where things live

- `artifacts/vidcraft-ai/src/app/page.tsx` — main home page
- `artifacts/vidcraft-ai/src/pages/` — LoginPage, SignupPage, PricingPage, PaymentVerifyPage
- `artifacts/vidcraft-ai/src/components/` — Navbar, GenerationForm, VideoDisplay
- `artifacts/vidcraft-ai/src/contexts/AuthContext.tsx` — auth state (JWT, user, credits)
- `artifacts/vidcraft-ai/src/lib/api-client.ts` — typed API calls including download
- `artifacts/api-server/src/routes/ai.ts` — video gen, upload, download, enhance
- `artifacts/api-server/src/routes/auth.ts` — register, login, logout, me, claim-daily-wan
- `artifacts/api-server/src/routes/payments.ts` — Paystack initialize, verify, webhook
- `artifacts/api-server/src/models/User.ts` — Mongoose user model
- `artifacts/api-server/src/middleware/auth.ts` — JWT middleware

## Secrets required

All stored in Replit Secrets (never in code):
- `PAXSENIX_API_KEYS` — comma-separated Paxsenix keys (Veo 3.1, Grok, Seedance)
- `EXSAL_API_KEY` — Exsal key (Wan 2.2)
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — secret for signing JWTs
- `PAYSTACK_SECRET_KEY` — Paystack secret key (NGN payments)

## Plans & Credits

| Plan    | Price     | Credits | Models             |
|---------|-----------|---------|---------------------|
| Free    | ₦0        | 3 start | Wan 2.2 only        |
| Starter | ₦1,000/mo | 20      | All 4 models        |
| Pro     | ₦3,000/mo | 60      | All 4 + image-to-vid|
| VIP     | ₦7,000/mo | ∞       | Everything priority |

Free users can claim 1 Wan 2.2 credit per day.

## Architecture decisions

- Video generation polls AFTER 4 min wait to avoid 503s on Paxsenix task URL
- Polling then runs every 15s for up to 6 min total
- Wan 2.2 is free (Exsal), all other models require paid plan
- Credit refunded automatically if generation fails
- Download goes via api-server (proxied) to force .mp4 with branded filename
- Security: helmet, rate limiting (200/15min general, 10 gen/hr, 20 auth/15min), right-click disabled, devtools detection
- No raw error messages exposed to users

## User preferences

- Naira (₦) only payments
- Always dark mode
- No console/dev panel shown to users
