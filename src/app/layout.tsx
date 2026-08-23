import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
