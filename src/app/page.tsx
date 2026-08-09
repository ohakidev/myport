import { getGitHubPortfolio } from "@/lib/github";
import { Journey } from "@/components/journey";

export default async function Home() {
  const portfolio = await getGitHubPortfolio();
  return <Journey portfolio={portfolio} />;
}
