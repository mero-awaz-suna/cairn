import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cairn — Speak your storm. Find your circle.",
  description:
    "A voice journal that knows when you need people — and finds exactly the right ones.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}