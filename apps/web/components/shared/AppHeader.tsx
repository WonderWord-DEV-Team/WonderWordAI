import Image from "next/image";

type AppHeaderProps = {
  activeTab?: "home" | "library" | "store" | "diagnostics";
  stars?: number;
  childName?: string;
};

const navItems = [
  { key: "home", label: "Home" },
  { key: "library", label: "Story Library" },
  { key: "store", label: "Store" },
  { key: "diagnostics", label: "Diagnostics" },
] as const;

export function AppHeader({
  activeTab = "home",
  stars = 1240,
  childName = "Emma",
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 sm:px-10 py-5 bg-[#FDF8F2]">
      <Image
        src="/logo.svg"
        alt="WonderWord AI"
        width={160}
        height={36}
        priority
      />

      <nav className="hidden sm:flex items-center gap-8 text-sm font-bold text-gray-700">
        {navItems.map((item) => (
          <a
            key={item.key}
            href="#"
            className={`min-h-[48px] flex items-center ${
              activeTab === item.key
                ? "text-[#E8604F] border-b-2 border-[#E8604F]"
                : "hover:text-[#E8604F]"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <span className="min-h-[48px] flex items-center gap-1 bg-white rounded-full px-3 py-1.5 text-sm font-bold text-gray-700 shadow-sm">
          ⭐ {stars.toLocaleString()}
        </span>
        <span className="min-h-[48px] flex items-center gap-2 bg-white rounded-full pl-1 pr-3 py-1 shadow-sm">
          <span className="w-7 h-7 rounded-full bg-gray-200" />
          <span className="text-sm font-bold text-gray-700">{childName}</span>
        </span>
      </div>
    </header>
  );
}