import { cp, mkdir, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await cp("out", "dist", { recursive: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await writeFile(
  "dist/server/index.js",
  'export default { fetch(request, env) { return env.ASSETS.fetch(request); } };\n',
);
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
