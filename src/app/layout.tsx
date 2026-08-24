import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ohakidev — Infinite Side Quest Portfolio",
  description:
    "Run, jump and loop forever through the public GitHub journey of ohakidev in a playable Three.js world.",
  metadataBase: new URL("https://github.com/ohakidev"),
  openGraph: {
    title: "ohakidev — Infinite Side Quest Portfolio",
    description: "Public GitHub experiments told as a seamless, infinitely looping Three.js journey.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
