import type { Metadata } from "next";
import { ResetPasswordForm } from "@/app/auth/reset-password/ResetPasswordForm";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const metadata: Metadata = {
  title: "Create new password",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout speechText="Don't worry, we'll get you back to your reading adventure!">
      <ResetPasswordForm />
    </AuthLayout>
  );
}