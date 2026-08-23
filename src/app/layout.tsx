import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ohakidev — Side Quest Portfolio",
  description:
    "Run, jump and explore the public GitHub journey of ohakidev in a playable Three.js side-scrolling world.",
  metadataBase: new URL("https://github.com/ohakidev"),
  openGraph: {
    title: "ohakidev — Side Quest Portfolio",
    description: "Public GitHub experiments told as a playable side-scrolling Three.js journey.",
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
