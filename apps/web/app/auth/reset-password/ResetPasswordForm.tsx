"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updatePassword } from "@/app/auth/actions";
import {
  initialResetPasswordState,
} from "@/app/auth/reset-password/state";
import { PasswordInput } from "@/components/auth/PasswordInput";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full min-h-12 rounded-xl bg-red-700 px-5 text-base font-black text-white shadow-md transition hover:bg-red-800 disabled:cursor-wait disabled:bg-gray-300"
    >
      {pending ? "Updating..." : "Update Password 🛡"}
    </button>
  );
}

export function ResetPasswordForm() {
  const [rawState, formAction] = useFormState(
    updatePassword,
    initialResetPasswordState
  );

  const state = rawState ?? initialResetPasswordState;

  if (state.success) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-black text-gray-900">
          Password Reset!
        </h1>

        <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Great job! Your password is all set. You can now log back in.
        </p>

        <a
          href="/auth/login"
          className="mt-6 block text-center min-h-12 leading-[3rem] rounded-xl bg-red-400 text-white font-black hover:bg-red-500"
        >
          → Back to Login
        </a>

        <p className="mt-4 text-xs font-bold text-gray-400">
          🛡 Your account is now secure
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-black text-gray-900">
        Create New Password
      </h1>

      <p className="mt-2 text-sm text-gray-500">
        Your security is our priority. Let&apos;s make sure your account is safe
        and sound.
      </p>

      <form action={formAction} className="mt-6 grid gap-5" noValidate>
        <PasswordInput
          id="password"
          name="password"
          label="New Password"
          autoComplete="new-password"
        />

        <p className="-mt-3 text-xs text-gray-400">
          Use 8+ characters with numbers and symbols
        </p>

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          autoComplete="new-password"
        />

        {state.message ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-gray-800"
          >
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </>
  );
}