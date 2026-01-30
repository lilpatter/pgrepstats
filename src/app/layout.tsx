import type { Metadata } from "next";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-pgrep-sans",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-pgrep-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PGREP | CS2 Player Intelligence",
  description:
    "PGREP is a futuristic CS2 reputation platform for scouting, reporting, and analyzing players across Steam, FACEIT, and Leetify.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${orbitron.variable} antialiased`}
      >
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
