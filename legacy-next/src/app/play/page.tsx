import type { Metadata } from "next";
import { Journey } from "@/components/journey";
import { getGitHubPortfolio } from "@/lib/github";

export const metadata: Metadata = {
  title: "Playground | Ohaki",
  description: "An optional, playable Three.js rooftop. Explore the projects or return to the portfolio at any time.",
};

export default async function Playground() {
  const portfolio = await getGitHubPortfolio();
  return <Journey portfolio={portfolio} />;
}
