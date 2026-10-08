"use client";
import { useActionState, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { FieldError, FormError, InnerForm, SubmitButton } from "@/components/ui/Form";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { CURRENCIES } from "@/lib/labels";
import { deleteMyAccount, updatePrefs, updateProfile } from "@/features/profile/actions";
import { AvatarPicker } from "@/features/profile/AvatarPicker";
import { CountryTimezone } from "@/features/profile/CountryTimezone";
import type { AvatarInfo } from "@/components/avatar/Avatar";
import type { ActionState, Profile } from "@/types/db";

function useToastOn(state: ActionState) {
  const toast = useToast();
  useEffect(() => { if (state.ok && state.message) toast(state.message); }, [state, toast]);
}

export function ProfileForm({ profile, me }: { profile: Profile; me: AvatarInfo }) {
  const [state, action] = useActionState(updateProfile, {});
  const [cur, setCur] = useState(profile.currency);
  useToastOn(state);
  return (
    <form action={action} className="form-grid" noValidate>
      <AvatarPicker key={`${me.avatar_kind}-${me.avatar_key}-${me.avatar_updated_at}-${me.gender}`} me={me} />
      <div className="field full"><label htmlFor="pf-name">Name</label><input className="input" id="pf-name" name="full_name" defaultValue={profile.full_name ?? ""} maxLength={80} /><FieldError state={state} name="full_name" /></div>
      <CountryTimezone idPrefix="pf" defaultCountry={profile.country} defaultTimezone={profile.timezone} detect={!profile.timezone} onCountry={(c, auto) => { if (!auto && c?.currency) setCur(c.currency); }}>
        <div className="field"><label htmlFor="pf-cur">Default currency</label><select className="select" id="pf-cur" name="currency" value={cur} onChange={(e) => setCur(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      </CountryTimezone>
      <p className="hint full" style={{ margin: 0 }}>Amounts are shown in INR. Accounts in other currencies are never converted without showing the rate, its source and when it was fetched.</p>
      <div className="full"><FormError state={state} /></div>
      <div className="full"><SubmitButton>Save profile</SubmitButton></div>
    </form>
  );
}

const PREFS = [
  ["notify_emi", "EMI reminders", "A week before each instalment"],
  ["notify_bills", "Bills and renewals", "Before you’re charged"],
  ["notify_lent", "Repayments", "Money lent or borrowed that falls due"],
  ["notify_budget", "Budget alerts", "At 85% and when a budget is exceeded"],
] as const;

export function PrefsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updatePrefs, {});
  useToastOn(state);
  return (
    <form action={action}>
      {PREFS.map(([k, l, d]) => (
        <div className="set-row" key={k}><div><b>{l}</b><span>{d}</span></div><label className="switch"><span className="sr">{l}</span><input type="checkbox" name={k} defaultChecked={profile[k]} /><span /></label></div>
      ))}
      <FormError state={state} />
      <div style={{ marginTop: 14 }}><SubmitButton className="btn btn-glass">Save notification settings</SubmitButton></div>
    </form>
  );
}

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-danger btn-sm" onClick={() => setOpen(true)}><Trash2 size={15} />Delete</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your Finance Book AI account?">
        <InnerForm action={deleteMyAccount} submitLabel="Delete my account" danger onDone={() => setOpen(false)} onCancel={() => setOpen(false)}>
          {(s) => (
            <>
              <p style={{ margin: 0, color: "var(--ink-2)" }}>Every account, transaction, loan, goal and record will be permanently deleted. Download a backup first if you want to keep a copy. This can’t be undone.</p>
              <div className="field"><label htmlFor="del-confirm">Type DELETE to confirm</label><input className="input" id="del-confirm" name="confirm" autoComplete="off" /><FieldError state={s} name="confirm" /></div>
            </>
          )}
        </InnerForm>
      </Dialog>
    </>
  );
}
