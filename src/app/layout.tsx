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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://velocicat.cat"),
  title: { default: "VelociCAT | Lloguer de cotxes de rally", template: "%s | VelociCAT" },
  description: "Lloguer de vehicles de rally preparats per competir. Descobreix la flota VelociCAT i consulta el calendari de curses.",
  openGraph: {
    type: "website",
    locale: "ca_ES",
    siteName: "VelociCAT",
    title: "VelociCAT | Lloguer de cotxes de rally",
    description: "Vehicles de pura raça preparats per devorar el crono al proper rally.",
  },
  twitter: { card: "summary_large_image", title: "VelociCAT | Lloguer de cotxes de rally" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
