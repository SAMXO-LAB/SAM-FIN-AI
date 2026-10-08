import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalLayout } from "@/components/Legal";

export const metadata: Metadata = { title: "Delete your account", description: "How to delete your Finance Book AI account and the data that is removed." };

export default function DeleteAccountInfo() {
  return (
    <LegalLayout title="Delete your account" intro="You can delete your Finance Book AI account and everything in it yourself, at any time, in under a minute. This page explains how and exactly what happens.">
      <section className="legal-short">
        <h2>How to delete your account</h2>
        <ol>
          <li><Link href="/login">Sign in</Link> to Finance Book AI in the app or on financebookai.com.</li>
          <li>Open <b>Settings</b>.</li>
          <li>Under <b>Delete account</b>, tap <b>Delete</b>.</li>
          <li>Type <b>DELETE</b> to confirm and tap <b>Delete my account</b>.</li>
        </ol>
        <p>Want a copy first? Use the downloads under <b>Your data</b> in Settings before you delete.</p>
      </section>

      <h2>What is deleted</h2>
      <ul>
        <li>Your profile, including your name, gender and profile picture.</li>
        <li>Every account, transaction, category, loan, EMI, lent and borrowed record, budget and savings goal you entered.</li>
        <li>Every receipt or photo you attached to a transaction.</li>
        <li>Your Ask Sam usage counters.</li>
        <li>Your sign-in itself, so the same email can no longer open the account.</li>
      </ul>
      <p>Deletion takes effect straight away and cannot be undone.</p>

      <h2>What may remain for a short time</h2>
      <p>Backups kept by our database provider and server logs kept by our hosting provider are cleared on those providers’ normal schedules. We do not use them to restore a deleted account. Messages you sent to Sam were passed to our AI provider to answer you and are governed by that provider’s retention rules, described in our <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>Can’t sign in?</h2>
      <p>If you can no longer sign in, use <Link href="/forgot-password">Forgot password</Link> to regain access, then delete the account as above. If that does not work, contact us from the email address registered on the account and we will delete it for you.</p>
      <ContactLine />

      <h2>Just want to delete some data?</h2>
      <p>You do not have to delete the whole account. You can delete individual transactions, accounts, loans, goals, receipts and your profile picture from inside the app, and each is removed immediately.</p>
    </LegalLayout>
  );
}
