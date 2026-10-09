import { getGitHubPortfolio } from "@/lib/github";
import { PortfolioHome } from "@/components/portfolio-home";
import "./portfolio.css";

export default async function Home() {
  const portfolio = await getGitHubPortfolio();
  return <PortfolioHome portfolio={portfolio} />;
}
