export function AppFooter() {
  return (
    <footer className="px-6 sm:px-10 py-8 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
      <div>
        <p className="font-display text-lg font-black">
          <span className="text-[#E8604F]">Wonder</span>
          <span className="text-[#3FC1B0]">Word</span>{" "}
          <span className="text-[#E8604F]">AI</span>
        </p>
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