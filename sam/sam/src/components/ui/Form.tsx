"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/types/db";
import { Dialog } from "./Dialog";
import { useToast } from "./Toast";

export type ServerAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function SubmitButton({ children, className = "btn btn-primary", pending: pendingLabel }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? <><span className="spin" aria-hidden="true" />{pendingLabel ?? "Saving…"}</> : children}
    </button>
  );
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const m = state.fields?.[name];
  return m ? <span className="field-err" role="alert">{m}</span> : null;
}

export function FormError({ state }: { state: ActionState }) {
  return state.error && !state.ok ? <div className="notice err" role="alert">{state.error}</div> : null;
}

/** A button that opens a dialog containing a form bound to a server action.
 *  On success the dialog closes and a toast shows the action's message. */
export function FormDialog({ trigger, triggerClass = "btn btn-primary", label, title, action, submitLabel, children, wide }: {
  trigger: React.ReactNode; triggerClass?: string; label?: string; title: string; action: ServerAction; submitLabel: string;
  children: (state: ActionState) => React.ReactNode; wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <button type="button" className={triggerClass} aria-label={label} onClick={() => { setKey((k) => k + 1); setOpen(true); }}>{trigger}</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} wide={wide}>
        <InnerForm key={key} action={action} submitLabel={submitLabel} onDone={() => setOpen(false)} onCancel={() => setOpen(false)}>{children}</InnerForm>
      </Dialog>
    </>
  );
}

export function InnerForm({ action, submitLabel, onDone, onCancel, children, danger }: {
  action: ServerAction; submitLabel: string; onDone: () => void; onCancel: () => void;
  children: (state: ActionState) => React.ReactNode; danger?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const toast = useToast();
  useEffect(() => {
    if (state.ok) { if (state.message) toast(state.message); onDone(); }
  }, [state, toast, onDone]);
  return (
    <form action={formAction} noValidate>
      <div style={{ display: "grid", gap: 14 }}>
        {children(state)}
        <FormError state={state} />
      </div>
      <div className="sheet-foot">
        <button type="button" className="btn btn-glass" onClick={onCancel}>Cancel</button>
        <SubmitButton className={danger ? "btn btn-danger" : "btn btn-primary"}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

/** Destructive action with a confirmation step. */
export function ConfirmButton({ action, id, title, body, cta = "Delete", trigger, triggerClass = "btn btn-ghost btn-sm", label, onDone }: {
  action: ServerAction; id: string; title: string; body: string; cta?: string; trigger: React.ReactNode; triggerClass?: string; label?: string; onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)} aria-label={label}>{trigger}</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <InnerForm action={action} submitLabel={cta} danger onDone={() => { setOpen(false); onDone?.(); }} onCancel={() => setOpen(false)}>
          {() => (<><input type="hidden" name="id" value={id} /><p style={{ margin: 0, color: "var(--ink-2)" }}>{body}</p></>)}
        </InnerForm>
      </Dialog>
    </>
  );
}
