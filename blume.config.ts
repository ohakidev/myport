// Validated by Blume's config schema; docs tooling stays separate from Next.js.
export default {
  title: "Ohaki — Developer handbook",
  description: "Current implementation, verification and development workflow.",
  content: { root: "docs" },
  agents: { llmsTxt: true },
  integrations: [{
    name: "isolate-next-postcss",
    hooks: {
      // Blume uses Tailwind 4; do not inherit the portfolio's Tailwind 3 config.
      "astro:config:setup": ({ updateConfig }: { updateConfig: (config: object) => void }) => {
        updateConfig({ vite: { css: { postcss: { plugins: [] } } } });
      },
    },
  }],
};
