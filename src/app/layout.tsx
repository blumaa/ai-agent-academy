import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AAAnalytics",
  description: "Agent & App Analyzer — Rubric-based evaluation for AI coding agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0D1117] text-[#E6EDF3]">
        <header className="border-b border-[#30363D] px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="text-lg font-bold tracking-tight">
              AAAnalytics
            </a>
            <nav className="flex gap-4 text-sm text-[#8B949E]">
              <a href="/" className="hover:text-[#E6EDF3]">
                Dashboard
              </a>
              <a href="/rubrics" className="hover:text-[#E6EDF3]">
                Rubrics
              </a>
              <a href="/runs" className="hover:text-[#E6EDF3]">
                Runs
              </a>
              <a href="/compare" className="hover:text-[#E6EDF3]">
                Compare
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
