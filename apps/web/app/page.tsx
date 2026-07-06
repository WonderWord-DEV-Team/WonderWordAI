import Link from "next/link";
import { BrandHeader } from "@/components/shared/BrandHeader";
import { PageContainer } from "@/components/shared/PageContainer";
import { StatusBadge } from "@/components/shared/StatusBadge";

const previewRoutes = [
  {
    href: "/child/demo-session/read",
    label: "Child reading preview",
    description: "Temporary route for the child reading session shell."
  },
  {
    href: "/parent/dashboard",
    label: "Parent dashboard preview",
    description: "Temporary route for the parent progress dashboard shell."
  }
];

export default function Home() {
  return (
    <main>
      <PageContainer className="py-6 sm:py-8">
        <BrandHeader variant="neutral" />

        <section className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-3xl">
            <StatusBadge tone="neutral">Initial web shell</StatusBadge>
            <h1 className="mt-6 font-display text-5xl font-black leading-[0.98] text-navy sm:text-6xl lg:text-7xl">
              WonderWord AI
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              This is the Week 1 Next.js shell for previewing the child reading
              session and parent dashboard routes before data, auth, uploads,
              microphone access, or ML integrations are connected.
            </p>
          </div>

          <div className="grid gap-4">
            {previewRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group rounded-[var(--radius-card)] border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-coral/60"
              >
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-coral">
                  Temporary preview route
                </span>
                <span className="mt-3 block text-xl font-extrabold text-navy">
                  {route.label}
                </span>
                <span className="mt-2 block text-sm leading-6 text-muted">
                  {route.description}
                </span>
                <span className="mt-4 inline-flex text-sm font-bold text-teal">
                  Open {route.href}
                  <span aria-hidden="true" className="ml-2 transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
