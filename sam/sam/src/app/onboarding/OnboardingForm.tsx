"use client";
import { useActionState, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/Brand";
import { FormError, SubmitButton } from "@/components/ui/Form";
import { saveOnboarding } from "@/features/profile/actions";

const GOALS = ["Build an emergency fund", "Pay off loans faster", "Save for travel", "Track who owes me", "Control daily spending", "Plan a big purchase"];
const INCOME = ["Under ₹25,000", "₹25,000 – ₹50,000", "₹50,000 – ₹1 lakh", "₹1 – 2 lakh", "Over ₹2 lakh", "Prefer not to say"];
const TITLES = ["Welcome to Finance Book", "What matters most to you?", "Stay ahead of due dates"];

export function OnboardingForm({ name }: { name: string }) {
  const [state, action] = useActionState(saveOnboarding, {});
  const [step, setStep] = useState(0);
  const [nm, setNm] = useState(name);
  const [gender, setGender] = useState("unspecified");
  return (
    <form action={action} className="sheet g4" style={{ width: "min(560px,100%)" }} noValidate>
      <div className="sheet-head">
        <LogoMark />
        <div style={{ display: "flex", gap: 6 }} aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, background: i <= step ? "var(--ink)" : "var(--track)", transition: "width .4s var(--spring)" }} />)}
        </div>
      </div>
      <h1 className="h1" style={{ fontSize: 30, marginBottom: 4 }}>{TITLES[step]}</h1>
      <p className="muted small" style={{ margin: "0 0 20px" }}>Step {step + 1} of 3 · You can change all of this later.</p>

      <div style={{ display: step === 0 ? "grid" : "none", gap: 14 }}>
        <div className="field"><label htmlFor="ob-name">What should we call you?</label><input className="input" id="ob-name" name="full_name" value={nm} onChange={(e) => setNm(e.target.value)} maxLength={80} autoFocus required /></div>
        <div className="field">
          <span className="lbl" id="ob-gender">Gender (optional)</span>
          <input type="hidden" name="gender" value={gender} />
          <div className="seg full" role="radiogroup" aria-labelledby="ob-gender">
            {([["male", "Male"], ["female", "Female"], ["unspecified", "Prefer not to say"]] as const).map(([g, l]) => (
              <button key={g} type="button" role="radio" aria-checked={gender === g} className={gender === g ? "on" : ""} onClick={() => setGender(g)}>{l}</button>
            ))}
          </div>
          <span className="hint">Used to pick your starting profile picture. You can upload your own photo later in Settings.</span>
        </div>
        <div className="form-grid">
          <div className="field"><label htmlFor="ob-cur">Currency</label><select className="select" id="ob-cur" name="currency" defaultValue="INR">{["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="ob-country">Country</label><input className="input" id="ob-country" name="country" defaultValue="India" maxLength={60} /></div>
        </div>
      </div>

      <div style={{ display: step === 1 ? "grid" : "none", gap: 18 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="lbl" style={{ marginBottom: 10 }}>Your goals (optional)</legend>
          <div className="chips">{GOALS.map((g) => <label key={g} className="chipbtn"><input type="checkbox" name="goals" value={g} />{g}</label>)}</div>
        </fieldset>
        <div className="field"><label htmlFor="ob-income">Monthly income range (optional)</label>
          <select className="select" id="ob-income" name="income_range" defaultValue=""><option value="">Skip</option>{INCOME.map((i) => <option key={i}>{i}</option>)}</select>
          <span className="hint">Used only to make insights relevant. Never shared.</span>
        </div>
      </div>

      <div style={{ display: step === 2 ? "block" : "none" }}>
        <div className="set-row"><div><b>EMI reminders</b><span>A week before each instalment</span></div><label className="switch"><span className="sr">EMI reminders</span><input type="checkbox" name="notify_emi" defaultChecked /><span /></label></div>
        <div className="set-row"><div><b>Bills and repayments</b><span>Before anything is due</span></div><label className="switch"><span className="sr">Bills and repayments</span><input type="checkbox" name="notify_bills" defaultChecked /><span /></label></div>
        <p className="notice info" style={{ marginTop: 16 }}><ShieldCheck size={17} />Finance Book never asks for your bank login, card PIN or OTP. You add accounts by name and balance.</p>
      </div>

      <div style={{ marginTop: 14 }}><FormError state={state} /></div>
      <div className="sheet-foot">
        {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Back</button> : <span />}
        {step < 2
          ? <button type="button" className="btn btn-primary" disabled={!nm.trim()} onClick={() => setStep(step + 1)}>Continue <ArrowRight size={16} /></button>
          : <SubmitButton pending="Setting up…">Open my dashboard <ArrowRight size={16} /></SubmitButton>}
      </div>
    </form>
  );
}
