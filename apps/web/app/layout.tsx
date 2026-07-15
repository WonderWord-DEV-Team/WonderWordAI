import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WonderWord AI",
    template: "%s | WonderWord AI"
  },
  description:
    "Initial WonderWord AI web shell for child reading sessions and parent progress previews."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <div className="ww-shell">{children}</div>
        </QueryProvider>
      </body>
    </html>
  );
}
