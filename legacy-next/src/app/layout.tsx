import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./portfolio-system.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Ohaki | Web Developer & Creative Technologist",
  description:
    "Selected web projects, source-backed engineering case studies, and an optional Three.js playground by Ohaki.",
  openGraph: {
    title: "Ohaki | Web Developer & Creative Technologist",
    description: "Real projects, a playful rooftop workshop, and the engineering behind the experience.",
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
