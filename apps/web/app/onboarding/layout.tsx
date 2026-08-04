import { OnboardingProvider } from "@/components/onboarding/OnboardingContext";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}