/**
 * The world is a small architectural atelier rather than a fantasy biome.
 * Keep the accents legible against slate and stone, but quiet enough that the
 * six project landmarks still read as the primary visual hierarchy.
 */
export const worldPalette = {
  // Deep ink is reserved for legible labels, seams, and the avatar; the
  // ground and architectural mass stay warm and light so the world reads as
  // a miniature courtyard instead of a dark green platform.
  slateDeep: "#26384a",
  slate: "#43566a",
  slateLight: "#7890a0",
  stone: "#d9d4c8",
  stoneLight: "#f4f1e8",
  soil: "#8b7762",
  sage: "#6d9b82",
  sageLight: "#a8c9ad",
  sageDark: "#c9c5b8",
  cobalt: "#2f61c3",
  cobaltLight: "#5d88df",
  terracotta: "#c87962",
  terracottaDark: "#9f5d50",
  brass: "#b18b4e",
  copper: "#b46b54",
  warm: "#e7b866",
  sky: "#dbe9e6",
} as const;

export const chapterColors = [
  worldPalette.cobalt,
  worldPalette.sageLight,
  worldPalette.warm,
  worldPalette.cobaltLight,
  "#9b88b0",
  worldPalette.terracotta,
];
export const chapterNames = ["ORIGIN", "CAMPUS", "MARKET", "WEB3", "ALPHA", "NOW"];

export const languageColors: Record<string, string> = {
  TypeScript: "#64e8ff",
  JavaScript: "#ffd166",
  Python: "#a7f46a",
  HTML: "#ff7a75",
  CSS: "#c6a4ff",
};

export function chapterColor(index: number) {
  return chapterColors[index % chapterColors.length];
}

export function languageColor(language: string | null) {
  return languageColors[language ?? ""] ?? "#fff8ea";
}
