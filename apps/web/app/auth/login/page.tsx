import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/auth/login/LoginForm";
import { getRoleHome } from "@/lib/auth/types";
import { getAuthContext } from "@/lib/auth/server";
import { AuthLayout } from "@/components/auth/AuthLayout";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export const metadata: Metadata = {
  title: "Sign In",
};

export const dynamic = "force-dynamic";

function getInitialError(error?: string) {
  if (error === "provisioning") {
    return "Your account is signed in, but it has not been provisioned with a valid role yet. Ask an administrator to finish setup.";
  }
  if (error === "auth-code-error") {
    return "Authentication failed or code expired. Please try signing in again.";
  }
  return undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const auth = await getAuthContext();

  if (auth) {
    redirect(getRoleHome(auth.role));
  }

  return (
    <AuthLayout speechText="Let's read your homework today!">
      <LoginForm initialError={getInitialError(searchParams?.error)} />
    </AuthLayout>
  );
}