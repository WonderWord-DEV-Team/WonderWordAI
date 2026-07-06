import type { Metadata } from "next";
import { ChildReadingShell } from "@/components/child/ChildReadingShell";

type ChildReadPageProps = {
  params: {
    sessionId: string;
  };
};

export const metadata: Metadata = {
  title: "Reading Session"
};

export default function ChildReadPage({ params }: ChildReadPageProps) {
  return <ChildReadingShell sessionId={params.sessionId} />;
}
