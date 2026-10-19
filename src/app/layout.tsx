import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["italic"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Callback — your career, backed by facts",
  description: "A private job-search assistant that finds roles with visible hiring evidence and drafts applications checked line by line against facts you confirmed.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#05060b", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${newsreader.variable}`}>
        <div className="ambient" aria-hidden />
        {children}
      </body>
    </html>
  );
}
