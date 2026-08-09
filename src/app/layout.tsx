import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ohakidev - Curious by default",
  description:
    "Walk the journey of ohakidev - a scroll-driven 3D story through public GitHub experiments.",
  metadataBase: new URL("https://github.com/ohakidev"),
  openGraph: {
    title: "ohakidev - Curious by default",
    description: "Research-led products and public experiments told as a walkable 3D journey.",
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
