"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { MailCheck } from "lucide-react";
import { FieldError, FormError, SubmitButton } from "@/components/ui/Form";
import { GoogleButton } from "./GoogleButton";
import { PasswordInput } from "./PasswordInput";
import { requestPasswordReset, resendConfirmation, signIn, signUp, updatePassword } from "./actions";

export function LoginForm({ next, notice }: { next: string; notice?: { tone: "err" | "ok" | "info"; text: string } }) {
  const [state, action] = useActionState(signIn, {});
  const [email, setEmail] = useState(""); // controlled so a failed attempt doesn't wipe it (React resets uncontrolled fields)
  return (
    <div className="auth-card g3">
      <div><h1>Welcome back</h1><p className="sub">Sign in to see where your money stands today.</p></div>
      {notice && <div className={`notice ${notice.tone}`} role="status">{notice.text}</div>}
      <GoogleButton next={next} />
      <div className="or">or</div>
      <form action={action} className="auth-form" noValidate>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!state.fields?.email || undefined} />
          <FieldError state={state} name="email" />
        </div>
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <label htmlFor="password" className="lbl">Password</label>
            <Link href="/forgot-password" className="text-link xs">Forgot password?</Link>
          </div>
          <PasswordInput id="password" name="password" autoComplete="current-password" invalid={!!state.fields?.password} />
          <FieldError state={state} name="password" />
        </div>
        <FormError state={state} />
        <SubmitButton className="btn btn-primary btn-block" pending="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="auth-foot">New to Sam Fin AI? <Link href="/signup">Create an account</Link></p>
    </div>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, {});
  const [name, setName] = useState(""), [email, setEmail] = useState("");
  if (state.ok) return <CheckInbox email={state.message ?? ""} />;
  return (
    <div className="auth-card g3">
      <div><h1>Create your account</h1><p className="sub">Free to start. Takes under a minute.</p></div>
      <GoogleButton next="/onboarding" label="Sign up with Google" />
      <div className="or">or</div>
      <form action={action} className="auth-form" noValidate>
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input className="input" id="full_name" name="full_name" autoComplete="name" required autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!state.fields?.full_name || undefined} />
          <FieldError state={state} name="full_name" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!state.fields?.email || undefined} />
          <FieldError state={state} name="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" meter invalid={!!state.fields?.password} />
          <FieldError state={state} name="password" />
        </div>
        <FormError state={state} />
        <SubmitButton className="btn btn-primary btn-block" pending="Creating account…">Create account</SubmitButton>
        <p className="hint" style={{ margin: 0, textAlign: "center" }}>By continuing you agree to Sam Fin AI’s terms and privacy policy.</p>
      </form>
      <p className="auth-foot">Already have an account? <Link href="/login">Sign in</Link></p>
    </div>
  );
}

function CheckInbox({ email }: { email: string }) {
  const [state, action] = useActionState(resendConfirmation, {});
  return (
    <div className="auth-card g3" style={{ textAlign: "center", justifyItems: "center" }}>
      <span className="empty" style={{ padding: 0 }}><span className="eic"><MailCheck size={26} /></span></span>
      <div><h1>Check your inbox</h1><p className="sub">We sent a confirmation link to <b style={{ color: "var(--ink)" }}>{email}</b>. Open it to activate your account.</p></div>
      <form action={action} style={{ width: "100%" }}>
        <input type="hidden" name="email" value={email} />
        {state.ok && <div className="notice ok" style={{ marginBottom: 12 }}>{state.message}</div>}
        <FormError state={state} />
        <SubmitButton className="btn btn-glass btn-block" pending="Sending…">Resend the link</SubmitButton>
      </form>
      <p className="auth-foot">Wrong email? <Link href="/signup" onClick={() => location.reload()}>Start again</Link></p>
    </div>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, {});
  return (
    <div className="auth-card g3">
      <div><h1>Reset your password</h1><p className="sub">Enter the email you use for Sam Fin AI and we’ll send you a reset link.</p></div>
      {state.ok ? (
        <div className="notice ok" role="status"><MailCheck size={17} />If an account exists for {state.message}, a reset link is on its way. It expires in one hour.</div>
      ) : (
        <form action={action} className="auth-form" noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required autoFocus />
            <FieldError state={state} name="email" />
          </div>
          <FormError state={state} />
          <SubmitButton className="btn btn-primary btn-block" pending="Sending…">Send reset link</SubmitButton>
        </form>
      )}
      <p className="auth-foot"><Link href="/login">Back to sign in</Link></p>
    </div>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, {});
  return (
    <div className="auth-card g3">
      <div><h1>Choose a new password</h1><p className="sub">You’ll stay signed in on this device.</p></div>
      <form action={action} className="auth-form" noValidate>
        <div className="field">
          <label htmlFor="password">New password</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" meter invalid={!!state.fields?.password} />
          <FieldError state={state} name="password" />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" invalid={!!state.fields?.confirm} />
          <FieldError state={state} name="confirm" />
        </div>
        <FormError state={state} />
        <SubmitButton className="btn btn-primary btn-block" pending="Updating…">Update password</SubmitButton>
      </form>
    </div>
  );
}
