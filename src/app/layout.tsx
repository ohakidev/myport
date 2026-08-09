import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ohakidev - Systems in Motion",
  description:
    "An interactive 3D portfolio generated from the public GitHub work of ohakidev.",
  metadataBase: new URL("https://github.com/ohakidev"),
  openGraph: {
    title: "ohakidev - Systems in Motion",
    description: "Backend, cloud, and tooling work told as an interactive repository universe.",
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
