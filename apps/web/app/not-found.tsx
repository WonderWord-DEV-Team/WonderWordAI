import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#FDFAF5] font-body text-[#2b2b2b]">
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto cursor-pointer" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="inline-block rounded-full bg-[#fdf1d6] px-4 py-1.5 text-xs font-black uppercase tracking-wide text-[#a3352b]">
          404
        </span>
        <h1 className="mt-5 font-serif text-4xl font-black text-[#a3352b] sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-[#5a5a5a]">
          We couldn&apos;t find the page you were looking for. It may have moved, or the link might be outdated.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#a3352b] px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#8c2c23]"
        >
          Back to Home
        </Link>
      </main>

      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1 mt-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#2b2b2b]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#2b2b2b]">Terms</Link>
            <a href="#" className="hover:text-[#2b2b2b]">Support</a>
            <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}