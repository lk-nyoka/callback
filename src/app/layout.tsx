import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["italic"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Callback",
  description: "A private job-search assistant that finds roles with visible hiring evidence and drafts applications checked line by line against facts you confirmed.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${instrument.variable} ${newsreader.variable}`}>{children}</body>
    </html>
  );
}
