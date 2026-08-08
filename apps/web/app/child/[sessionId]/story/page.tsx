"use client";

export default function ThemedStoryPage() {
  // TODO (friend): read the theme from the URL, e.g.:
  // const searchParams = useSearchParams();
  // const theme = searchParams.get("theme");
  //
  // TODO (friend): call POST /api/themed-stories/generate with { theme, grade }
  // and render the result (title + text) inside the container below.
  // The ml-service endpoint (/themed-story) and the Next bridge route already
  // exist and work — this page just needs the fetch + loading/error states + UI.

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b] flex flex-col justify-between font-body">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="/child" className="hover:text-[#2b2b2b]">Home</a>
            <a href="#" className="hover:text-[#2b2b2b]">Story Library</a>
            <a href="#" className="hover:text-[#2b2b2b]">Store</a>
            <a href="#" className="hover:text-[#2b2b2b]">Diagnostics</a>
          </nav>

          {/* TODO (friend): swap for real avatar/name + back/logout controls,
              same pattern as ChildHomeClient.tsx */}
          <div className="flex items-center gap-3" />
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Main Content                                                    */}
      {/* ---------------------------------------------------------------- */}
      <main className="mx-auto w-full max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-16 flex-1 flex flex-col justify-center">
        {/* TODO (friend): this container is where the generated story
            (title + text) should render, with loading/error states while
            POST /api/themed-stories/generate resolves. */}
        <div className="rounded-[24px] border border-[#ecdfc9]/60 bg-white p-10 shadow-sm">
          <p className="text-center text-lg font-extrabold text-[#8a8a8a]">
            {/* placeholder */}
            Story goes here.
          </p>
        </div>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-[#2b2b2b]">Privacy</a>
            <a href="/terms" className="hover:text-[#2b2b2b]">Terms</a>
            <a href="/help" className="hover:text-[#2b2b2b]">Support</a>
            <a href="#" className="hover:text-[#2b2b2b]">About Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}