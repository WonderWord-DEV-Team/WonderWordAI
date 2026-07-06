import Link from "next/link";
import { BrandHeader } from "@/components/shared/BrandHeader";
import { PageContainer } from "@/components/shared/PageContainer";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function NotFound() {
  return (
    <main>
      <PageContainer className="py-6 sm:py-8">
        <BrandHeader variant="neutral" />
        <section className="mt-16 max-w-xl">
          <StatusBadge tone="neutral">Shell route missing</StatusBadge>
          <h1 className="mt-5 font-display text-4xl font-black text-navy">
            Page not found
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            This Week 1 shell only includes the root preview, child reading
            session, and parent dashboard routes.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex min-h-12 items-center rounded-[var(--radius-card)] bg-navy px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-slate-800"
          >
            Back to shell index
          </Link>
        </section>
      </PageContainer>
    </main>
  );
}
