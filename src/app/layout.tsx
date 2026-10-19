import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { AppBackground } from "@/components/layout";
import { FavoritesProvider } from "@/context";
import { SessionProvider } from "@/lib/auth";
import { THEME_BOOT_SCRIPT, ThemeProvider } from "@/lib/theme";

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

/**
 * `viewportFit: "cover"` is what makes `env(safe-area-inset-*)` report real
 * values on notched phones — without it they are always 0 and the fixed
 * mobile bar sits on top of the iOS home indicator. The shell pads the
 * navbar, `<main>` and the bottom bar with those insets.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning`: the boot script below may set
    // `data-theme` on `<html>` before React hydrates it. It only silences
    // this element's own attributes, not its children.
    <html
      lang="es"
      className={`${bricolageGrotesque.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a dark session's theme before the first paint; see
            `THEME_BOOT_SCRIPT`. A plain inline script, not `next/script`:
            even `beforeInteractive` is queued (`self.__next_s`) until
            Next's client bundle boots, by which time the body may have
            painted. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppBackground />
        <SessionProvider>
          <ThemeProvider>
            <FavoritesProvider>{children}</FavoritesProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
