import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ohakidev - Curious by default",
  description:
    "A 3D storytelling portfolio following the public experiments of ohakidev.",
  metadataBase: new URL("https://github.com/ohakidev"),
  openGraph: {
    title: "ohakidev - Curious by default",
    description: "Research-led products and public experiments told through an interactive 3D tree.",
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
