import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/auth/login/LoginForm";
import { getRoleHome } from "@/lib/auth/types";
import { getAuthContext } from "@/lib/auth/server";
import { BrandHeader } from "@/components/shared/BrandHeader";
import { PageContainer } from "@/components/shared/PageContainer";
import { StatusBadge } from "@/components/shared/StatusBadge";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export const metadata: Metadata = {
  title: "Sign In"
};

export const dynamic = "force-dynamic";

function getInitialError(error?: string) {
  if (error !== "provisioning") {
    return undefined;
  }

  return "Your account is signed in, but it has not been provisioned with a valid role yet. Ask an administrator to finish setup.";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const auth = await getAuthContext();

  if (auth) {
    redirect(getRoleHome(auth.role));
  }

  return (
    <main>
      <PageContainer className="py-6 sm:py-8">
        <BrandHeader variant="neutral" />

        <section className="mx-auto mt-12 max-w-lg rounded-[var(--radius-card)] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
          <StatusBadge tone="neutral">Secure access</StatusBadge>
          <h1 className="mt-5 font-display text-4xl font-black leading-tight text-navy">
            Sign in to WonderWord AI
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Use the account your administrator provisioned for your parent or child role.
          </p>

          <LoginForm initialError={getInitialError(searchParams?.error)} />
        </section>
      </PageContainer>
    </main>
  );
}
