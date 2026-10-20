import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calificación — Bandas de Guerra",
  description:
    "Calificación en vivo para encuentros intercolegiales de bandas de guerra.",
};

export const viewport: Viewport = {
  // Los jueces califican en tableta: evitar el zoom accidental al teclear.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#020617",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
