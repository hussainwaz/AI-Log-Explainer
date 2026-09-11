import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Log Explainer",
  description:
    "Paste a stack trace or a wall of log output and get the root cause, ranked fixes, and what to check next.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Resolve the theme before first paint, so a dark-mode machine never
            gets a flash of the cream ground. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');" +
              "if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" +
              "document.documentElement.setAttribute('data-theme',t)}catch(e){}})()",
          }}
        />
      </head>
      <body className={`${bricolage.variable} antialiased`}>{children}</body>
    </html>
  );
}
