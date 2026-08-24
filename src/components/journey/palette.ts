export const chapterColors = ["#64e8ff", "#ffd166", "#ff7a75", "#a7f46a", "#c6a4ff", "#ffb86b"];
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
