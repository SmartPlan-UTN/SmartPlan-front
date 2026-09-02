import type { Metadata } from "next";
import localFont from "next/font/local";

import { AppBackground } from "@/components/layout";
import { SessionProvider } from "@/lib/auth";

import "./globals.css";

const bricolageGrotesque = localFont({
  src: "./fonts/BricolageGrotesque-VariableFont_opsz_wdth_wght.ttf",
  variable: "--font-bricolage-grotesque",
  weight: "200 800",
  display: "swap",
});

/**
 * A high-contrast display serif, used only for the hero's second headline
 * line ("Recibí un plan.") so it reads as a different voice from the
 * grotesque above it. Two subsets: `latin` covers Spanish on its own,
 * `latin-ext` is a small insurance for stray glyphs.
 */
const fraunces = localFont({
  src: [
    { path: "./fonts/Fraunces-SemiBold-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Fraunces-SemiBold-latin-ext.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  // The `template` builds each screen's title: "Favoritos · smartplan".
  title: {
    default: "smartplan",
    template: "%s · smartplan",
  },
  description:
    "Armá tu plan según tu presupuesto, tu tiempo y tus ganas. Recomendaciones de salidas en Mendoza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${bricolageGrotesque.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppBackground />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
