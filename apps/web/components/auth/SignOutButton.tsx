"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/app/auth/actions";

function ButtonContent() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-10 rounded-[var(--radius-card)] border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-600 transition hover:border-coral/40 hover:text-coral disabled:cursor-wait disabled:text-slate-400"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <ButtonContent />
    </form>
  );
}
