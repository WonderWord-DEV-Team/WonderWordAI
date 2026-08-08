"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInWithPassword } from "@/app/auth/actions";
import { initialLoginState, type LoginActionState } from "@/app/auth/login/state";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type LoginFormProps = {
  initialError?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full min-h-12 rounded-xl bg-red-400 px-5 text-base font-black text-white shadow-md transition hover:bg-red-500 disabled:cursor-wait disabled:bg-gray-300"
    >
      {pending ? "Signing in..." : "Log In 🚀"}
    </button>
  );
}

export function LoginForm({ initialError }: LoginFormProps) {
  const seededState: LoginActionState = {
    ...initialLoginState,
    message: initialError ?? null,
  };
  const [rawState, formAction] = useFormState(signInWithPassword, seededState);
  const state = rawState ?? seededState;

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        console.error("Google sign in error:", error);
        setGoogleLoading(false);
      }
    } catch (e) {
      console.error(e);
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <img src="/logo.svg" alt="WonderWord AI" className="h-8 ml-20 w-auto fig-center" />
      <h1 className="mt-2 text-center text-3xl font-serif font-bold text-[#a3352b]">Welcome Back!</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        Log in to check on your child&apos;s progress.
      </p>
      <button
        type="button"
        disabled={googleLoading}
        onClick={handleGoogleSignIn}
        className="mt-6 w-full min-h-12 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {googleLoading ? "Connecting to Google..." : "Continue with Google"}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          Or continue with email
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form action={formAction} className="grid gap-5" noValidate>
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-bold text-gray-900">
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

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-bold text-gray-900">
              Password
            </label>
            <a href="/auth/forgot-password" className="text-sm font-bold text-blue-500 hover:underline">
              Forgot Password?
            </a>
          </div>
          <div className="mt-2">
            <PasswordInputBare />
          </div>
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

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/onboarding/step-1" className="font-bold text-red-500 hover:underline">
          Sign Up
       </Link>
      </p>
    </>
  );
}

// Inline bare password field (no label, since label is handled above for layout match)
function PasswordInputBare() {
  return <PasswordInput id="password" name="password" label="" autoComplete="current-password" />;
}