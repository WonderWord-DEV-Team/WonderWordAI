import Link from "next/link";

type BrandHeaderProps = {
  variant: "child" | "parent" | "neutral";
};

const variantStyles = {
  child: "border-coral/30 bg-white/88",
  parent: "border-teal/30 bg-white/90",
  neutral: "border-slate-200 bg-white/88"
};

export function BrandHeader({ variant }: BrandHeaderProps) {
  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border px-4 py-3 shadow-soft backdrop-blur ${variantStyles[variant]}`}
    >
      <Link href="/" className="flex min-h-11 items-center gap-3">
        <span className="grid size-11 place-items-center rounded-[var(--radius-card)] bg-navy text-lg font-black text-white">
          W
        </span>
        <span>
          <span className="block text-base font-black leading-tight text-navy">
            WonderWord AI
          </span>
          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {variant === "parent" ? "Parent preview" : variant === "child" ? "Reader preview" : "Web shell"}
          </span>
        </span>
      </Link>

      <nav aria-label="Preview routes" className="flex flex-wrap gap-2">
        <Link
          href="/child/demo-session/read"
          className="min-h-10 rounded-[var(--radius-card)] border border-coral/30 px-3 py-2 text-sm font-extrabold text-coral transition hover:bg-coral/10"
        >
          Child
        </Link>
        <Link
          href="/parent/dashboard"
          className="min-h-10 rounded-[var(--radius-card)] border border-teal/30 px-3 py-2 text-sm font-extrabold text-teal transition hover:bg-teal/10"
        >
          Parent
        </Link>
      </nav>
    </header>
  );
}
