import { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
  speechText?: string;
};

export function AuthLayout({ children, speechText }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-300 via-orange-400 to-red-500 flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center gap-10">
        {/* Left side — mascot */}
        <div className="hidden sm:flex flex-col items-center gap-4 flex-shrink-0 w-64">
          {speechText && (
            <div className="relative bg-white rounded-2xl px-5 py-4 text-center text-sm text-gray-700 shadow-lg">
              {speechText}
              <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
            </div>
          )}
          <div className="w-40 h-40 rounded-full bg-white/90 shadow-xl" />
          <div className="text-center">
            <p className="text-white text-2xl font-black">Hi, I&apos;m Fox!</p>
            <p className="text-white/90 text-sm">Let&apos;s read together! ✨</p>
          </div>
        </div>

        {/* Right side — form card */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          {children}
        </div>
      </div>
    </main>
  );
}