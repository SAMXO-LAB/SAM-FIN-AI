# Sam Fin AI — personal finance, beautifully understood

*Money, managed.* Your personal assistant inside the app is called **Sam**.

Next.js 15 (App Router) + Supabase (Postgres, Auth, Row Level Security). Amounts are stored as integer paise, so there is no floating-point money. Default currency is INR.

**Built:** sign up / sign in (email + password, Google), email confirmation, password reset, onboarding, dashboard, accounts, transactions (income, expense, transfer, search, filters, CSV export), EMIs & loans with amortisation schedules, money lent and borrowed with repayments, budgets, savings goals, light/dark/system themes, account deletion.

**Not built yet:** receipt scanner, an LLM assistant, admin panel, investments, bills & subscriptions, reports, notification centre, global search.

Sam Fin AI never asks for bank logins, PINs or OTPs.

## 1. Create a Supabase project
1. Create a project at <https://supabase.com>.
2. **SQL Editor** → paste `supabase/migrations/20261004000000_init.sql` → Run. This creates every table, the RLS policies, triggers and the `delete_my_account()` function.
3. **Project settings → API**: copy the Project URL and the `anon` public key.

## 2. Configure auth
**Authentication → URL Configuration**
- Site URL: your public URL (`http://localhost:3000` locally)
- Redirect URLs: add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback`

**Authentication → Providers → Email**: keep it enabled. "Confirm email" on is recommended for production; Sam Fin AI handles both settings.

**Google sign-in**
1. <https://console.cloud.google.com> → APIs & Services → Credentials → *Create credentials → OAuth client ID* → type *Web application*.
2. Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (this is Supabase's URL, not Sam Fin AI's).
3. Copy the Client ID and Client secret into **Supabase → Authentication → Providers → Google** and enable it.
4. Configure the OAuth consent screen (app name, support email, authorised domain).

## 3. Run locally
```bash
cp .env.example .env.local   # fill in the three values
npm install
npm run dev                  # http://localhost:3000
npm test                     # finance maths unit tests
npm run typecheck
```

## 4. Deploy (Vercel)
Import the repo, set the same three environment variables (`NEXT_PUBLIC_SITE_URL` = your production URL), deploy, then add the production `/auth/callback` URL in Supabase (step 2).

## Security notes
- Every table has RLS: a user can only read and write their own rows. Foreign keys are composite `(id, user_id)`, so a row cannot point at another user's data.
- Server actions validate input with Zod and re-check the session with `getUser()`.
- `next` redirects after login are restricted to same-site paths. CSV export neutralises spreadsheet formulas.
- Security headers are set in `next.config.ts`. Review the CSP once your final domains are known.
- The anon key is public by design. Never put the `service_role` key in this app.

## Layout
```
src/app            routes (landing, auth, app pages, export API)
src/features       server actions + forms per domain
src/lib            money, dates, finance maths, validation, data access
supabase/migrations  schema + RLS
```
