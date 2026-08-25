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
      className={`${bricolageGrotesque.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppBackground />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
