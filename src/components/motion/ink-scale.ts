/** Linear draw for the about rule. Scroll progress is the only input. */
export function inkScale(progress: number) {
  if (!Number.isFinite(progress)) return 1;
  return Math.min(1, Math.max(0, progress));
}
