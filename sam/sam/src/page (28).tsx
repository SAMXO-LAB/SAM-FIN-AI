import type { Metadata } from "next";
import { ContactLine, LegalLayout } from "@/components/Legal";

export const metadata: Metadata = { title: "Privacy Policy", description: "What Finance Book AI collects, why, who sees it, and how to download or delete your data." };

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" intro="Finance Book AI helps you keep track of your own money. This page explains, in plain words, what we collect, why, who it is shared with and how you stay in control.">
      <section className="legal-short">
        <h2>The short version</h2>
        <ul>
          <li>We never ask for your bank login, card number, PIN or OTP, and we do not connect to your bank.</li>
          <li>The records you enter are visible only to you. We do not sell your data or show ads.</li>
          <li>Your data is stored with trusted service providers (listed below) that run the app for us.</li>
          <li>You can download everything or delete your account at any time from Settings.</li>
        </ul>
      </section>

      <h2>1. What we collect</h2>
      <h3>Account details</h3>
      <p>Your name and email address, and a password if you sign up with email. Passwords are never stored in readable form; they are hashed by our authentication provider.</p>
      <h3>If you sign in with Google</h3>
      <p>Google tells us your name and email address, and it also passes along your Google profile picture address. We use the name and email only to create and recognise your account, and we do not display or copy your Google picture. We do not ask for access to your Gmail, contacts, Drive, calendar or any other Google data.</p>
      <h3>Country and time zone</h3>
<p>At sign-up we suggest your country, time zone and currency from your device’s clock settings, and you can change them. We store your choices so that dates, due reminders and your greeting follow your local time. We do not collect your location.</p>
      <h3>Profile picture and gender (optional)</h3>
<p>You can choose a built-in picture or upload your own photo, and you can say whether you are male, female or prefer not to say. Gender is used only to choose a default picture. A photo is cropped and resized on your own device, then stored in your account in our database. It is shown only to you and is deleted when you remove it or delete your account. Please do not upload photos of other people.</p>
      <h3>Money records you enter</h3>
      <p>Accounts (by name and balance), transactions, categories, loans and EMIs, money you have lent or borrowed, budgets and savings goals, and your settings such as currency and theme. You choose what to enter. We do not read your bank statements or messages.</p>
      <h3>Receipts and photos (optional)</h3>
      <p>When you add or edit a transaction you may attach up to three receipt or photo images. They are shrunk on your device, stored in your account in our database and shown only to you. They are deleted when you remove them, delete the transaction or delete your account. They are not included in the JSON backup, but you can open and save each one from its transaction. Please cover card numbers, OTPs and other people’s personal details before uploading.</p>
      <h3>Questions you ask Sam</h3>
      <p>See section 4 for exactly what is sent when you use the Ask Sam assistant.</p>
      <h3>Technical data</h3>
      <p>Like any website, our hosting provider sees your IP address, browser type and the pages requested, and keeps short-lived server logs for security and reliability. We do not use these to build advertising profiles.</p>
      <h3>What we do not collect</h3>
      <p>Bank or card credentials, PINs, OTPs, SMS or notification content, your contacts, your precise location, or your photos.</p>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run the app: sign you in, show your balances, spending, loans, budgets and goals, and let you export your data.</li>
        <li>To answer your questions when you use Sam.</li>
        <li>To keep the service secure, prevent abuse (for example, a daily limit on assistant messages) and fix problems.</li>
        <li>To send essential emails such as account confirmation and password reset.</li>
      </ul>
      <p>We do not use your records for advertising, and we do not sell or rent them.</p>

      <h2>3. Who we share it with</h2>
      <p>We use these service providers to operate Finance Book AI. They process data on our behalf and only to provide their service.</p>
      <div className="legal-table" role="table" aria-label="Service providers">
        <div role="row" className="lt-h"><span role="columnheader">Provider</span><span role="columnheader">What it does</span><span role="columnheader">Data involved</span></div>
        <div role="row"><span role="cell"><a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase</a></span><span role="cell">Database and sign-in</span><span role="cell">Account details, your profile picture, receipts and all records you enter</span></div>
        <div role="row"><span role="cell"><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel</a></span><span role="cell">Website hosting</span><span role="cell">Requests to the site, IP address, logs</span></div>
        <div role="row"><span role="cell"><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google</a></span><span role="cell">“Sign in with Google”</span><span role="cell">Name, email, profile picture (only if you choose Google sign-in)</span></div>
        <div role="row"><span role="cell">AI provider (currently Google Gemini)</span><span role="cell">Writes Sam’s answers</span><span role="cell">Your question and the figures Sam looks up to answer it (see section 4)</span></div>
      </div>
      <p>We may also disclose information if the law requires it, or to protect the safety and rights of our users and the service. If Finance Book AI is ever merged with or acquired by another business, we will tell you before your data is transferred and give you the choice to delete it.</p>

      <h2>4. The Ask Sam assistant</h2>
      <ul>
        <li>When you send a message, we send it, the last few messages of that chat, and the specific figures Sam looks up from your records to answer it (for example your balances, a spending summary, or loan details) to our AI provider.</li>
        <li>Sam can only read your own records and cannot add, change or delete anything.</li>
        <li>We do not save your chat in our database. It lives in your browser and is cleared when you start a new chat or close the page. We keep only a count of messages per day, to apply a daily limit.</li>
        <li>The AI provider handles those requests under its own terms. Depending on the provider and plan, requests may be kept for a limited time, and on some free plans may be used to improve the provider’s products. Please do not type passwords, OTPs or card numbers into the chat.</li>
        <li>Sam can make mistakes. Check important figures against your records, and do not treat answers as financial, tax or legal advice.</li>
      </ul>

      <h2>5. Cookies and similar storage</h2>
      <p>We use only what is needed to run the app: secure cookies that keep you signed in, and a small browser setting that remembers your light or dark theme. We do not use advertising or third-party analytics cookies.</p>

      <h2>6. Where your data is stored</h2>
      <p>Our providers run servers in different countries, so your data may be processed outside India. We choose providers that use encryption in transit and at rest and have their own security and privacy commitments.</p>

      <h2>7. How long we keep it</h2>
      <p>We keep your data while your account is open. When you delete your account in Settings, your profile and every record you entered are deleted from our database straight away. Provider backups and server logs are cleared on the provider’s normal schedule. If you only stop using the app, your data stays until you delete it.</p>

      <h2>8. Your rights and choices</h2>
      <ul>
        <li><b>Access and portability:</b> Settings → Your data lets you download everything you have recorded.</li>
        <li><b>Correction:</b> you can edit or delete any record in the app, and update your profile.</li>
        <li><b>Erasure:</b> Settings → Delete account removes your account and records.</li>
        <li><b>Withdraw consent:</b> stop using Sam, or sign out and delete your account, at any time.</li>
        <li><b>Complaints:</b> if you think we have handled your data wrongly, contact us first. You may also have the right to complain to your data protection authority. Under India’s Digital Personal Data Protection Act, 2023 you have rights to access, correction, erasure and grievance redressal, and you can use the contact details below.</li>
      </ul>

      <h2>9. Security</h2>
      <p>Connections are encrypted with HTTPS. Every table is protected by row-level security in the database, so each signed-in user can read and change only their own rows. Passwords are hashed. No system is perfectly secure, so please use a strong, unique password and keep your devices updated. If we learn of a breach that affects you, we will tell you as the law requires.</p>

      <h2>10. Children</h2>
      <p>Finance Book AI is meant for people aged 18 and over. We do not knowingly collect data from children. If you believe a child has created an account, tell us and we will delete it.</p>

      <h2>11. Changes to this policy</h2>
      <p>If we make important changes, we will update the date at the top of this page and, where appropriate, tell you in the app or by email.</p>

      <h2>12. Contact</h2>
      <ContactLine />
    </LegalLayout>
  );
}
