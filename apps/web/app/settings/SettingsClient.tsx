"use client";

import { useState } from "react";
import {
  User,
  Bell,
  Users,
  CreditCard,
  Lock,
  Info,
  Eye,
  EyeOff,
  ArrowRight,
  Pause,
  Trash2,
  LogOut,
  HelpCircle,
} from "lucide-react";

import Link from "next/link";

// -----------------------------------------------------------------------------
// WonderWord AI — Settings page
// Next.js App Router page component (app/settings/page.tsx)
// Tailwind CSS + lucide-react. Needs "use client" for toggles/selectable chips.
//
// LOGO: uses /public/logo.svg — same file used on the other pages.
// -----------------------------------------------------------------------------

const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "children", label: "Children", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Privacy and Data", icon: Lock },
  { id: "information", label: "Information", icon: Info },
];

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-[#df7856]" : "bg-[#e3ddd4]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-[#f3cfcb] overflow-hidden rounded-2xl border border-[#f3cfcb] bg-white">
      {children}
    </div>
  );
}

function SettingsRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[#fdf3f2] p-5">
      <div>
        <p className="text-sm font-semibold text-[#2b2b2b]">{title}</p>
        <p className="mt-1 text-xs text-[#8a8a8a]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SettingsClient({ parentName }: { parentName: string }) {
  const [activeSection, setActiveSection] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("Leo");
  const [selectedSpeed, setSelectedSpeed] = useState("Normal");

  const VOICES = [
    { name: "Leo", emoji: "🦁" },
    { name: "Stella", emoji: "⭐" },
    { name: "Bear", emoji: "🐻" },
    { name: "Cosmo", emoji: "🚀" },
  ];

  const SPEEDS = [
    { name: "Slow", emoji: "🐢" },
    { name: "Normal", emoji: "👣" },
    { name: "Fast", emoji: "🐇" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFAF5] text-[#2b2b2b]">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <header className="border-b border-[#ecdfc9] bg-white">
        <div className="relative mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WonderWord AI" className="h-8 w-auto" />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-8 text-sm font-medium text-[#4a4a4a] md:flex">
            <a href="#" className="hover:text-[#2b2b2b]">
              Home
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Story Library
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Store
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Diagnostics
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-pink-300 text-xs font-black text-white">
              {parentName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{parentName}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] px-6 py-10">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-[#a3352b] md:text-5xl">Settings</h1>
          <p className="mt-1 text-sm text-[#8a8a8a]">
            Manage your account, children, and preferences
          </p>
        </div>

        <div className="mt-10 flex gap-12">
          {/* ---------------------------------------------------------------- */}
          {/* Sidebar nav                                                      */}
          {/* ---------------------------------------------------------------- */}
          <aside className="hidden w-56 shrink-0 md:block">
            <nav className="sticky top-10 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-[#2b2b2b] shadow-sm"
                        : "text-[#7a7a7a] hover:bg-white/60 hover:text-[#2b2b2b]"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* ---------------------------------------------------------------- */}
          {/* Content                                                          */}
          {/* ---------------------------------------------------------------- */}
          <main className="min-w-0 flex-1 space-y-12 pb-16">
            {/* Profile */}
            <section id="profile">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-[#2b2b2b]" />
              <h2 className="font-bold">Profile</h2>
            </div>
            <div className="space-y-4 rounded-2xl border border-[#f3cfcb] bg-[#fdf5f4] p-6">
              <div>
                <label className="text-sm font-semibold text-[#2b2b2b]">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="example name"
                  className="mt-1.5 w-full rounded-lg border border-[#e3ddd4] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#b5b5b5] focus:border-[#df7856]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#2b2b2b]">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="hello@example.com"
                  className="mt-1.5 w-full rounded-lg border border-[#e3ddd4] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#b5b5b5] focus:border-[#df7856]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#2b2b2b]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="123-456-7890"
                  className="mt-1.5 w-full rounded-lg border border-[#e3ddd4] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#b5b5b5] focus:border-[#df7856]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#2b2b2b]">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[#e3ddd4] bg-white px-3 py-2.5 pr-10 text-sm outline-none placeholder:text-[#b5b5b5] focus:border-[#df7856]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a8a8]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#2b2b2b]" />
              <h2 className="font-bold">Notifications</h2>
            </div>
            <SettingsCard>
              <SettingsRow
                title="Bi-weekly report via SMS"
                description="Receive Emma's progress report by text"
                action={<Toggle defaultOn />}
              />
              <SettingsRow
                title="New activity recommendations"
                description="Get notified when a new activity is ready"
                action={<Toggle defaultOn />}
              />
              <SettingsRow
                title="Weekly digest email"
                description="A summary of the week's reading every Sunday"
                action={<Toggle />}
              />
              <SettingsRow
                title="Session reminders"
                description="Remind Emma to read if she misses a day"
                action={<Toggle defaultOn />}
              />
            </SettingsCard>
          </section>

          {/* Children */}
          <section id="children">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#2b2b2b]" />
              <h2 className="font-bold">Children</h2>
            </div>
            <SettingsCard>
              {["Emma", "Emma"].map((name, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#fdf3f2] p-5">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-[#e3ddd4]" />
                  <div>
                    <p className="text-sm font-semibold text-[#2b2b2b]">
                      {name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8a8a8a]">
                      Grade 2 | Age 7 | Since Aug 2024
                    </p>
                  </div>
                </div>
              ))}
            </SettingsCard>
          </section>

          {/* Voice Preference */}
          <section id="voice-preference">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm">🔊</span>
              <h2 className="font-bold">Voice Preference</h2>
            </div>
            <div className="space-y-5 rounded-2xl border border-[#f3cfcb] bg-[#fdf5f4] p-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-[#2b2b2b]">
                  Pick who reads aloud
                </p>
                <div className="flex flex-wrap gap-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVoice(v.name)}
                      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selectedVoice === v.name
                          ? "border-[#df7856] bg-[#df7856] text-white"
                          : "border-[#e3ddd4] bg-white text-[#5a5a5a] hover:border-[#df7856]"
                      }`}
                    >
                      <span>{v.emoji}</span>
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-[#2b2b2b]">
                  Voice Speed
                </p>
                <div className="flex flex-wrap gap-2">
                  {SPEEDS.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => setSelectedSpeed(s.name)}
                      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selectedSpeed === s.name
                          ? "border-[#df7856] bg-[#df7856] text-white"
                          : "border-[#e3ddd4] bg-white text-[#5a5a5a] hover:border-[#df7856]"
                      }`}
                    >
                      <span>{s.emoji}</span>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Privacy and Data */}
          <section id="privacy">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#2b2b2b]" />
              <h2 className="font-bold">Privacy and Data</h2>
            </div>
            <SettingsCard>
              <SettingsRow
                title="Retain voice samples"
                description="Allow WonderWord to use voice recordings to improve speech recognition (opt-in)"
                action={<Toggle defaultOn />}
              />
              <SettingsRow
                title="Download my data"
                description="Export all your account data (GDPR / CCPA)"
                action={
                  <button className="rounded-full border border-[#e3ddd4] bg-white px-4 py-1.5 text-xs font-semibold text-[#2b2b2b] hover:border-[#df7856]">
                    Export
                  </button>
                }
              />
              <button className="flex w-full items-center justify-between bg-[#fdf3f2] p-5 text-left">
                <div>
                  <p className="text-sm font-semibold text-[#2b2b2b]">
                    Data retention policy
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    See how long we keep your data
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#a8a8a8]" />
              </button>
            </SettingsCard>
          </section>

          {/* Billing */}
          <section id="billing">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#2b2b2b]" />
              <h2 className="font-bold">Billing</h2>
            </div>
            <SettingsCard>
              <div className="bg-[#fdf3f2] p-5">
                <p className="text-sm font-semibold text-[#2b2b2b]">
                  Current Plan
                </p>
                <p className="mt-1 text-sm font-semibold text-[#a3352b]">
                  Plan 1: $9.99/mo
                </p>
              </div>
              <button className="flex w-full items-center justify-between bg-[#fdf3f2] p-5 text-left">
                <div>
                  <p className="text-sm font-semibold text-[#2b2b2b]">
                    Billing and Invoices
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    View past invoices and update your payment method
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#a8a8a8]" />
              </button>
            </SettingsCard>
          </section>

          {/* Information */}
          <section id="information">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-[#2b2b2b]" />
              <h2 className="font-bold">Information</h2>
            </div>
            <SettingsCard>
              <button className="flex w-full items-center justify-between bg-[#fdf3f2] p-5 text-left">
                <div>
                  <p className="text-sm font-semibold text-[#2b2b2b]">
                    Pause Subscription
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    Temporarily pause billing — your data is kept safe
                  </p>
                </div>
                <Pause className="h-4 w-4 shrink-0 text-[#2b2b2b]" />
              </button>

              <button className="flex w-full items-center justify-between bg-[#fdf3f2] p-5 text-left">
                <div>
                  <p className="text-sm font-semibold text-[#a3352b]">
                    Delete Account
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    Permanently deletes all data for you and your children.
                    This cannot be undone.
                  </p>
                </div>
                <Trash2 className="h-4 w-4 shrink-0 text-[#a3352b]" />
              </button>

              <button className="flex w-full items-center justify-between bg-[#fdf3f2] p-5 text-left">
                <div>
                  <p className="text-sm font-semibold text-[#2b2b2b]">
                    Logout
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    Sign out of your account on this device
                  </p>
                </div>
                <LogOut className="h-4 w-4 shrink-0 text-[#2b2b2b]" />
              </button>

              <Link href="/help" className="flex w-full items-center justify-between bg-[#fdf3f2] p-5 text-left">
                <div>
                  <p className="text-sm font-semibold text-[#2b2b2b]">
                    Help/FAQ
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a8a]">
                    Get answers or contact support
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#a8a8a8]" />
              </Link>
            </SettingsCard>
          </section>
        </main>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[#f0e6d8] bg-white py-8">
        <div className="mx-auto flex max-w-6xl 2xl:max-w-[1500px] min-[1800px]:max-w-[1700px] flex-col items-center justify-between gap-4 px-6 text-sm text-[#8a8a8a] md:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div>
            <img src="/logo.svg" alt="WonderWord AI" className="h-6 w-auto opacity-80" />
            <p className="ml-1">© 2026 WonderWord AI.</p>
          </div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#2b2b2b]">
              Privacy
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Terms
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              Support
            </a>
            <a href="#" className="hover:text-[#2b2b2b]">
              About Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
