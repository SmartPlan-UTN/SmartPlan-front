import type { Metadata } from "next";
import localFont from "next/font/local";

import { SessionProvider } from "@/lib/auth";

import "./globals.css";

const briqueuegeGrotesque = localFont({
  src: "./fonts/BricolageGrotesque-VariableFont_opsz_wdth_wght.ttf",
  variable: "--font-briqueuege-grotesque",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  // El `template` arma el título de cada pantalla: "Favorites · smartplan".
  title: {
    default: "smartplan",
    template: "%s · smartplan",
  },
  description:
    "Armá tu plan según tu budget, tu tiempo y tus ganas. Recomendaciones de salidas en Mendoza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${briqueuegeGrotesque.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
