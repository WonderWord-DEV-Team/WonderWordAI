export function LandingFooter() {
  return (
    <footer className="px-6 sm:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <p className="text-lg font-black text-[#E8604F]">WonderWord AI</p>
        <p className="text-xs text-gray-400 mt-1">© 2024 WonderWord AI.</p>
      </div>
      <nav className="flex gap-6 text-sm font-bold text-gray-500">
        <a href="#" className="hover:text-[#E8604F]">Privacy</a>
        <a href="#" className="hover:text-[#E8604F]">Terms</a>
        <a href="#" className="hover:text-[#E8604F]">Support</a>
        <a href="#" className="hover:text-[#E8604F]">About Us</a>
      </nav>
    </footer>
  );
}