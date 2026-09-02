"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInWithPassword } from "@/app/auth/actions";
import { initialLoginState, type LoginActionState } from "@/app/auth/login/state";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/shared/Button";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type LoginFormProps = {
  initialError?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in..." : "Log In 🚀"}
    </Button>
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
      <Button
        type="button"
        variant="white"
        disabled={googleLoading}
        onClick={handleGoogleSignIn}
        className="mt-6 w-full"
      >
        {googleLoading ? "Connecting to Google..." : "Continue with Google"}
      </Button>

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

        <div className="grid gap-2">
          <label htmlFor="password" className="text-sm font-bold text-gray-900">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        {state.message ? (
          <p role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-gray-800">
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </form>
    </>
  );
}
