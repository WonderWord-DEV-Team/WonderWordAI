"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInWithPassword } from "@/app/auth/actions";
import { initialLoginState, type LoginActionState } from "@/app/auth/login/state";

type LoginFormProps = {
  initialError?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-[var(--radius-card)] bg-coral px-5 text-base font-black text-white shadow-soft transition hover:bg-coral/90 disabled:cursor-wait disabled:bg-slate-300"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm({ initialError }: LoginFormProps) {
  const seededState: LoginActionState = {
    ...initialLoginState,
    message: initialError ?? null
  };
  const [state, formAction] = useFormState(signInWithPassword, seededState);

  return (
    <form action={formAction} className="mt-8 grid gap-5" noValidate>
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-extrabold text-navy">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          className="min-h-12 rounded-[var(--radius-card)] border border-slate-200 bg-white px-4 text-base text-navy shadow-sm outline-none transition focus:border-coral"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-extrabold text-navy">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 rounded-[var(--radius-card)] border border-slate-200 bg-white px-4 text-base text-navy shadow-sm outline-none transition focus:border-coral"
        />
      </div>

      {state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[var(--radius-card)] border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-bold leading-6 text-navy"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
