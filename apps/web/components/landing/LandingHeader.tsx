export function LandingHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-6 sm:px-12">
      <p className="text-2xl font-black text-[#E8604F]">WonderWord AI</p>
      <nav className="hidden sm:flex items-center gap-10 text-sm font-semibold text-gray-600">
        <a href="#" className="text-[#E8604F] border-b-2 border-[#E8604F] pb-1">
          Home
        </a>
        <a href="#how-it-works" className="hover:text-[#E8604F]">
          How it Works
        </a>
        <a href="#pricing" className="hover:text-[#E8604F]">
          Pricing
        </a>
      </nav>
      <a
        href="/auth/login"
        className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-bold text-gray-800 hover:bg-white"
      >
        Login
      </a>
    </header>
  );
}