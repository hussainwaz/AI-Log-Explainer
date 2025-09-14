import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "AI Log Explainer",
  description: "Your intelligent debugging assistant. Paste any log file and get instant, clear explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${inter.variable} antialiased bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))]`}
      >
        {children}
      </body>
    </html>
  );
}