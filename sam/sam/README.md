# Finance Book AI — personal finance, beautifully understood

*Money, managed.* Your personal assistant inside the app is called **Sam**.

Next.js 15 (App Router) + Supabase (Postgres, Auth, Row Level Security). Amounts are stored as integer paise, so there is no floating-point money. Default currency is INR.

**Built:** optional receipt/photo attachments on transactions, profile pictures (own photo or built-in avatars, chosen by gender), Ask Sam (AI assistant, read-only), sign up / sign in (email + password, Google), email confirmation, password reset, onboarding, dashboard, accounts, transactions (income, expense, transfer, search, filters, CSV export), EMIs & loans with amortisation schedules, money lent and borrowed with repayments, budgets, savings goals, light/dark/system themes, account deletion.

**Not built yet:** receipt scanner, assistant actions that change data (add/edit records), admin panel, investments, bills & subscriptions, reports, notification centre, global search.

Finance Book AI never asks for bank logins, PINs or OTPs.

## 1. Create a Supabase project
1. Create a project at <https://supabase.com>.
2. **SQL Editor** → paste `supabase/migrations/20261004000000_init.sql` → Run. This creates every table, the RLS policies, triggers and the `delete_my_account()` function.
3. Also run `supabase/migrations/20261004100000_assistant.sql` (the AI assistant's daily message limit) `supabase/migrations/20261005100000_profile_picture.sql` (profile picture and gender) `supabase/migrations/20261005200000_receipts.sql` (transaction receipts) and `supabase/migrations/20261007100000_timezone.sql` (country time zone). The app keeps working if you forget the last three, but pictures, gender, receipts and the chosen time zone are not saved until they have run (dates then use Asia/Kolkata, or `APP_TIMEZONE`). Receipt images are stored in the database (about 300 KB each, 3 per transaction, 300 per user); move them to Supabase Storage if you expect many more.
4. **Project settings → API**: copy the Project URL and the `anon` public key.

## 2. Configure auth
**Authentication → URL Configuration**
- Site URL: your public URL (`http://localhost:3000` locally)
- Redirect URLs: add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback`

**Authentication → Providers → Email**: keep it enabled. "Confirm email" on is recommended for production; Finance Book AI handles both settings.

**Google sign-in**
1. <https://console.cloud.google.com> → APIs & Services → Credentials → *Create credentials → OAuth client ID* → type *Web application*.
2. Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback` (this is Supabase's URL, not Finance Book AI's).
3. Copy the Client ID and Client secret into **Supabase → Authentication → Providers → Google** and enable it.
4. Configure the OAuth consent screen (app name, support email, authorised domain).

## 3. Run locally
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
npm test                     # finance maths unit tests
npm run typecheck
```

## 4. Deploy (Vercel)
Import the repo, set the same three environment variables (`NEXT_PUBLIC_SITE_URL` = your production URL), deploy, then add the production `/auth/callback` URL in Supabase (step 2).

## 5. Ask Sam (AI assistant)
Sam answers questions about the signed-in user's own data (balances, spending, loans and EMIs, money lent/borrowed, budgets, goals) and can run what-if maths such as a loan prepayment. It is **read-only**: it cannot add, edit or delete anything, and it does not give regulated investment advice.

**Free option: Google Gemini.**
1. Open <https://aistudio.google.com>, sign in, click **Get API key** and copy it.
2. Add it as `GEMINI_API_KEY` in `.env.local` and in Vercel (Settings → Environment Variables), then **redeploy**.
3. Run the assistant migration (step 1.3) so the daily limit is enforced in the database.

Other providers (set the matching key; or set `AI_PROVIDER` and `AI_API_KEY` explicitly):

| Provider | Key variable | Default model | Free tier |
|---|---|---|---|
| Google Gemini | `GEMINI_API_KEY` | `gemini-3.8-flash` | yes |
| Groq | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | yes |
| Cerebras | `CEREBRAS_API_KEY` | `gpt-oss-120b` | yes (small limits) |
| OpenRouter | `OPENROUTER_API_KEY` | `meta-llama/llama-3.3-70b-instruct:free` | yes (about 50 requests/day without credits) |
| Mistral | `MISTRAL_API_KEY` | `mistral-small-latest` | yes (restrictive) |
| Anthropic Claude | `ANTHROPIC_API_KEY` | `claude-sonnet-5-5` | no |

Override any model with `<PROVIDER>_MODEL` (for example `OPENROUTER_MODEL`). Free model names change often; if one is retired Sam just skips to the next.

**Automatic fallback.** Free tiers have limits and sometimes run busy. Sam tries the next option automatically: several Gemini models first (`gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`; free quotas are counted per model), then every other provider whose key you have set, in the order of the table above. Adding a second free key (Groq, Cerebras or OpenRouter) alongside `GEMINI_API_KEY` is the easiest way to get more headroom. Only if all of them are busy does the user see "Sam is busy".

Optional: `AI_FALLBACK_MODELS` (comma-separated models to try after `AI_MODEL`), `AI_MODEL` (e.g. `gemini-3.5-flash-lite` if you hit free-tier limits), `ASSISTANT_DAILY_LIMIT` (messages per user per day, default 40). Model names and free quotas change; check the provider's pricing page. Free tiers may allow the provider to use prompts to improve their products. Use a paid key before real users rely on it.

How it stays safe: the key is only used on the server; the route checks the session and same-origin; tools run as the signed-in user so RLS applies; tool results are passed to the model as untrusted data; each user is limited to a daily message count.

## 6. Legal pages
`/privacy` and `/terms` are public pages (linked from the footer, sign-up and sign-in). They describe what the app actually does today (Supabase, Vercel, Google sign-in, an AI provider, no analytics). **If you change any of that (add analytics, change AI provider, store chats), update `src/app/privacy/page.tsx`.** Have a lawyer review both before you rely on them.
Set `NEXT_PUBLIC_CONTACT_EMAIL` to show a contact address on both pages.

## 7. Android app (Google Play)
The site is an installable PWA (`/manifest.webmanifest`, `/sw.js`, offline page). To publish it on Google Play as a Trusted Web Activity,
follow [`store/PLAY_STORE_GUIDE.md`](store/PLAY_STORE_GUIDE.md). Listing text, data-safety answers, icon, feature graphic and screenshots are in `store/`.
Set `ANDROID_PACKAGE_NAME` and `ANDROID_SHA256_FINGERPRINTS` so `/.well-known/assetlinks.json` links the app to the site.
`/delete-account` is the public account-deletion page Google requires.

## Security notes
- Every table has RLS: a user can only read and write their own rows. Foreign keys are composite `(id, user_id)`, so a row cannot point at another user's data.
- Server actions validate input with Zod and re-check the session with `getUser()`.
- `next` redirects after login are restricted to same-site paths. CSV export neutralises spreadsheet formulas.
- Security headers are set in `next.config.ts`. Review the CSP once your final domains are known.
- The anon key is public by design. Never put the `service_role` key in this app.

## Layout
```
src/app            routes (landing, auth, app pages, export + assistant APIs)
src/features       server actions + forms per domain
src/lib            money, dates, finance maths, validation, data access
src/lib/assistant  Sam: system prompt, tools, streaming loop, daily limit
supabase/migrations  schema + RLS
```
