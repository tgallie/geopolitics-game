import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { AccountPanel } from "@/components/account-panel";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "World Conquerer",
  description: "A turn-based world conquest strategy game.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pixelFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AccountPanel />{children}</body>
    </html>
  );
}
