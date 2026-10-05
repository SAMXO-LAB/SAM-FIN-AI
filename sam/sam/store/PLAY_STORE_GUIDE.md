# Publish Finance Book AI on Google Play: step by step

Finance Book AI is a website that now works as an installable app (PWA). For Google Play we wrap that website in a thin Android shell called a **Trusted Web Activity (TWA)**. Users get a real Play Store app, full screen, with no browser address bar. Your site stays the single source of truth: every time you deploy to Vercel, the app updates by itself. **You do not need to publish a new Android version for website changes.**

Everything in this guide that touches Google (account, signing, upload, review) has to be done by you. Nothing in your code can do it for you.

> **What is already done in the code**
> - `/manifest.webmanifest` and icons (normal and maskable) so the site is installable
> - `/sw.js` service worker with a friendly offline page. It never caches your money pages.
> - `/.well-known/assetlinks.json` driven by two environment variables (step 5)
> - `/delete-account` page (Play requires a public account-deletion URL)
> - Store graphics and listing text in this `store/` folder

---

## 0. Before you start (about 10 minutes)
1. Deploy this version to Vercel (git push, as before). Run the three Supabase migrations if you have not yet.
2. Open https://financebookai.com/manifest.webmanifest and https://financebookai.com/delete-account. Both must load.
3. **Use one address consistently.** If `www.financebookai.com` redirects to `financebookai.com` (or the other way), use the address people actually end up on. Everywhere below, I write `financebookai.com`; replace it with your real final address if different. `/.well-known/assetlinks.json` must open **directly** on that address (no redirect).

## 1. Create a Google Play Console account
1. Go to https://play.google.com/console and sign up (use a Google account you will keep long term).
2. Pay the one-time **US$25** registration fee.
3. Complete **identity verification** (government ID, address, a phone number). It can take from a day to a few days.
4. Account type: **Personal** is fine for you. Be aware of the rule below.

> **Important rule for new personal accounts** (created after 13 Nov 2023): before you can publish to production you must run a **closed test with at least 12 testers who stay opted in for 14 continuous days**. Plan for this now: ask 12+ friends, family or classmates for the Gmail address they use on their Android phone. An *organization* account (needs a D-U-N-S number) is exempt, but is more paperwork. Google changes these rules, so confirm in Play Console → Dashboard → "Set up your app / Test and release".

## 2. Make the Android app file (AAB) with PWABuilder (no coding, no Android Studio)
1. Open https://www.pwabuilder.com and enter `https://financebookai.com`. Press Start.
2. Check the report. You should see the manifest, service worker and HTTPS as passing. (Warnings about screenshots or shortcuts are optional.)
3. Press **Package for stores → Android → Generate package**. (PWABuilder changes its screens now and then, so labels may differ slightly.) Use these settings:
   - **Package ID**: `com.financebookai.app` (permanent; can never be changed after publishing; letters, numbers and dots only)
   - **App name**: Finance Book AI  ·  **Short name**: Finance Book AI
   - **App version**: 1 · **Version code**: 1 (increase both each time you upload a new file)
   - **Host**: `financebookai.com`  ·  **Start URL**: `/dashboard`
   - **Display mode**: standalone  ·  **Notifications**: off  ·  **Location / Play billing / Google Play Billing**: off
   - **Signing key**: choose **"Create new"** and fill in the form. **Download the zip when it finishes and keep it safe**: it contains your `.aab` file, a `signing.keystore`, a password file and `assetlinks.json`. Back up the keystore and passwords somewhere private (like a password manager). If you lose them you cannot update the app by that route.
4. You get a zip. Inside is `…release-bundle.aab` (upload this to Play) and `signing-key-info.txt`.

## 3. Upload to a closed test first
1. Play Console → **Create app**: name *Finance Book AI*, language English (India), **App**, **Free**, accept the declarations.
2. Left menu → **Test and release → Testing → Closed testing → Create track** → **Create release**.
3. When asked about **Play App Signing**, accept it (recommended). Upload the `.aab`.
4. Release name `1`, notes "First release". Save → Review → **Start rollout to closed testing**.
5. Open the **Testers** tab, create an email list with your 12+ testers, save, and copy the **opt-in link**. Send it to them. Each tester must tap the link, accept, and **install the app from Play**. They must stay opted in for 14 days.

## 4. Fill in the store listing and policy forms
All text is ready to copy from `store/LISTING.md`:
- **Main store listing**: name, short and full description, icon (`play-icon-512.png`), feature graphic (`feature-graphic-1024x500.png`) and 2 to 8 phone screenshots (`store/screenshots/`).
- **App content** (Policy → App content): privacy policy URL, ads (none), **App access** (give a demo email and password), content rating questionnaire, target audience (18+), **Data safety** (table in LISTING.md, including the deletion URL), **Financial features** declaration, government app (no), health (no).

## 5. Link the app to your website (this removes the browser bar)
Without this step the app opens with a visible address bar.
1. In Play Console open your app → **Test and release → Setup → App signing**. Copy the **SHA-256 certificate fingerprint** under "App signing key certificate". (It looks like `AA:BB:CC:...`, 32 pairs.) Optionally also copy the "Upload key certificate" fingerprint, so a sideloaded test build works too.
2. In Vercel → your project → Settings → Environment Variables, add:
   - `ANDROID_PACKAGE_NAME` = `com.financebookai.app` (exactly what you used in step 2)
   - `ANDROID_SHA256_FINGERPRINTS` = the fingerprint(s), comma separated
3. **Redeploy** the project.
4. Open https://financebookai.com/.well-known/assetlinks.json. It must show your package name and fingerprint. You can also test at https://developers.google.com/digital-asset-links/tools/generator.
5. On a phone with the Play version installed, fully close and reopen the app. The address bar should be gone. (Android caches this check, so it can take a few minutes. If it still shows the bar, uninstall and reinstall.)

## 6. Google sign-in inside the app
The app opens "Continue with Google" in the phone's browser tab (Chrome Custom Tab) and returns to the app. That is allowed by Google (embedded WebViews are what is banned). Nothing to change; just test it once on a real phone. If you see a return to the browser rather than the app, re-check step 5 (the asset link) since the redirect back into the app depends on it.

## 7. After 14 days: apply for production
1. Play Console → Dashboard → **Apply for production** and answer the questions about your closed test.
2. Google reviews it (often a few days).
3. When approved: **Production → Create release** → add the same (or a newer) `.aab` → submit. First reviews of a new app can take several days, sometimes longer.

## 8. Updating later
- **Website changes** (new features, fixes): just deploy to Vercel. The app shows them instantly.
- **Changes to the Android shell** (rare: name, icon, package settings): rebuild in PWABuilder, using your *same* keystore (choose "Use mine" and upload the keystore), increase the Version code, upload the new `.aab` as a new release.

## Troubleshooting
| Problem | Fix |
|---|---|
| App shows a URL bar at the top | The asset link is not matching. Check the package name and fingerprint in Vercel, redeploy, open `/.well-known/assetlinks.json`, and make sure it loads without any redirect. Use the *Play App Signing* fingerprint, not just the upload key. |
| PWABuilder says the manifest or service worker is missing | Make sure the latest version is deployed and the URL you typed is the final one (no redirect). |
| Google sign-in lands on the website instead of the app | Same as above (asset link). Also confirm the Supabase redirect URLs include your domain. |
| Play rejects for "Account deletion" | The Data safety form must contain `https://financebookai.com/delete-account`, and in-app deletion exists in Settings. |
| Play rejects for "Financial services" | Say plainly that the app only tracks the user's own records and offers no loans, payments or advice. See LISTING.md. |
| Package name already taken | Use another, e.g. `in.financebookai.app`. Update `ANDROID_PACKAGE_NAME` to match. |

## Costs and effort summary
- Play Console: US$25 once. Nothing else is required; PWABuilder is free.
- Time: setup 1 to 2 hours, then the 14-day closed test, then Google review.
