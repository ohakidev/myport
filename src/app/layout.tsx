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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('ohaki-portfolio-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.portfolioTheme=t;document.documentElement.dataset.theme=t;}}catch{}` }} />
        {children}
      </body>
    </html>
  );
}
