import type { Metadata } from "next";
import { ContactLine, LegalLayout } from "@/components/Legal";

export const metadata: Metadata = { title: "Terms of Service", description: "The rules for using Finance Book AI." };

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" intro="These terms are the agreement between you and Finance Book AI. By creating an account or using the app, you accept them. If you do not agree, please do not use the service.">
      <h2>1. What Finance Book AI is</h2>
      <p>Finance Book AI is a tool for recording and understanding your own money: accounts, transactions, loans and EMIs, money lent or borrowed, budgets and goals, with an AI assistant called Sam. It is a record-keeping and planning aid. It does not hold or move money, and it does not connect to your bank.</p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be 18 or older and able to enter a binding agreement.</li>
        <li>Give accurate details and keep your password safe. You are responsible for activity on your account.</li>
        <li>Tell us promptly if you think someone else has accessed your account.</li>
      </ul>

      <h2>3. Not financial advice</h2>
      <p>Finance Book AI and Sam provide information and calculations, not investment, tax, legal or accounting advice. We are not a registered investment adviser. Projections and estimates (such as EMI schedules or savings plans) depend on the information you enter and on assumptions that may not hold. Make your own decisions, and speak to a qualified professional where it matters.</p>

      <h2>4. The AI assistant</h2>
      <p>Sam can make mistakes or misunderstand a question. Check important figures against your own records before acting on them. Sam is read-only: it cannot move money or change your data. Do not type passwords, OTPs or card numbers into the chat. We may limit how many assistant messages you can send each day.</p>

      <h2>5. Your data</h2>
      <p>You own the records you enter. You give us permission to store and process them only to provide the service, as described in our <a href="/privacy">Privacy Policy</a>. You can download or delete your data at any time from Settings.</p>

      <h2>6. Acceptable use</h2>
      <p>Do not misuse the service. In particular, do not:</p>
      <ul>
        <li>break the law, or use Finance Book AI to record or hide unlawful activity;</li>
        <li>try to access someone else’s account or data, or probe, scan or attack the service;</li>
        <li>overload the service, scrape it, or use bots or automated tools without our permission;</li>
        <li>copy, resell or reverse engineer the service, except where the law allows.</li>
      </ul>

      <h2>7. Availability and changes</h2>
      <p>We work to keep Finance Book AI running and your data safe, but we cannot promise it will always be available or error-free. Features may change, and we may add or remove features. Keep your own copy of anything important by using the export in Settings.</p>

      <h2>8. Ending your use</h2>
      <p>You can stop using Finance Book AI and delete your account at any time. We may suspend or close an account that breaks these terms or puts the service or other users at risk. We will give notice where we reasonably can.</p>

      <h2>9. Disclaimers and liability</h2>
      <p>The service is provided “as is” and “as available”. To the extent the law allows, we do not give any warranty about accuracy or fitness for a particular purpose, and we are not liable for indirect or consequential loss, lost profits, or losses that result from decisions you make using the app. Nothing in these terms limits liability that cannot be limited by law.</p>

      <h2>10. Changes to these terms</h2>
      <p>We may update these terms. If a change is important, we will update the date at the top of this page and tell you in the app or by email. Continuing to use Finance Book AI after a change means you accept it.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of India, and the courts of India have jurisdiction, unless your local consumer law says otherwise.</p>

      <h2>12. Contact</h2>
      <ContactLine />
    </LegalLayout>
  );
}
