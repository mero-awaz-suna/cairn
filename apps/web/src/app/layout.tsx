import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Nunito, Caveat } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cairn — You are not the only one carrying this",
  description:
    "A peer wellness platform for South Asian and Nepali individuals navigating high-pressure transitions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F5F0EA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${nunito.variable} ${caveat.variable}`}
    >
      <body className="bg-warm-cream text-stone font-body antialiased">
        {children}
      </body>
    </html>
  );
}
