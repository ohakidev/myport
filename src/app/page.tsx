import { getGitHubPortfolio } from "@/lib/github";
import { RepositoryUniverse } from "@/components/repository-universe";

export default async function Home() {
  const portfolio = await getGitHubPortfolio();
  return <RepositoryUniverse portfolio={portfolio} />;
}
