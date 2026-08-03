import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/app/auth/forgot-password/ForgotPasswordForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout speechText="Don't worry, we'll get you back to your reading adventure!">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}