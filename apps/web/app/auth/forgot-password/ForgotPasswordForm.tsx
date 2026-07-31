"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordReset } from "@/app/auth/actions";
import {
  initialForgotPasswordState,
  type ForgotPasswordActionState,
} from "@/app/auth/forgot-password/state";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full min-h-12 rounded-xl bg-red-400 px-5 text-base font-black text-white shadow-md transition hover:bg-red-500 disabled:cursor-wait disabled:bg-gray-300"
    >
      {pending ? "Sending..." : "Send Reset Link ➤"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [rawState, formAction] = useFormState(
    requestPasswordReset,
    initialForgotPasswordState
  );

  const state = rawState ?? initialForgotPasswordState;

  if (state.success) {
    return (
      <>
        <h1 className="text-center text-2xl font-black text-red-600">
          Check Your Email
        </h1>

        <p className="mt-3 text-center text-sm text-gray-600">
          We sent a reset link to your email! Please check your inbox (and your
          spam folder, just in case).
        </p>

        <a
          href="/auth/login"
          className="mt-6 block text-center min-h-12 leading-[3rem] rounded-xl bg-red-700 text-white font-black hover:bg-red-800"
        >
          → Back to Login
        </a>

        <p className="mt-4 text-center text-sm text-gray-500">
          Didn&apos;t receive anything?{" "}
          <button
            type="submit"
            form="forgot-password-form"
            className="font-bold text-red-600 hover:underline"
          >
            Resend Email
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-center text-red-500 font-black text-xl">
        WonderWord AI
      </p>

      <h1 className="mt-2 text-center text-2xl font-black text-gray-900">
        Forgot Password?
      </h1>

      <p className="mt-3 text-center text-sm text-gray-500">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <form
        id="forgot-password-form"
        action={formAction}
        className="mt-6 grid gap-5"
        noValidate
      >
        <div className="grid gap-2">
          <label
            htmlFor="email"
            className="text-xs font-bold text-gray-900 uppercase tracking-wide"
          >
            Email Address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="hello@example.com"
            defaultValue={state.email}
            className="min-h-12 rounded-xl border border-gray-200 bg-white px-4 text-base text-gray-900 outline-none transition focus:border-red-400"
          />
        </div>

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

      <a
        href="/auth/login"
        className="mt-4 block text-center text-sm font-bold text-red-500 hover:underline"
      >
        ← Back to Log In
      </a>
    </>
  );
}