import type { Metadata } from "next";
import { ParentDashboardShell } from "@/components/parent/ParentDashboardShell";

export const metadata: Metadata = {
  title: "Parent Dashboard"
};

export default function ParentDashboardPage() {
  return <ParentDashboardShell />;
}
