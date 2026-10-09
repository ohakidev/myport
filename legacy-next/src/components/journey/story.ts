import type { Project } from "@/lib/github";

export type StoryBeat = { title: string; premise: string; lesson: string; mode: "collect" | "sequence" | "deliver" };

// Gameplay metaphors, not claims about private project history or outcomes.
const stories: Record<string, StoryBeat> = {
  dvechontech: { title: "The first little website", premise: "Every useful page begins with scattered ideas. Bring three ideas together to light this workshop.", lesson: "A website gives scattered information a place to live. This chapter points to the real dvechontech repository.", mode: "collect" },
  stdactivity_check: { title: "A place for everyone", premise: "The campus desk is waiting. Carry three activity records from the tray to the archive, one at a time.", lesson: "Checking student activity becomes a workflow: receive a record, keep it organised, make it findable.", mode: "deliver" },
  stdactivitycheckV2: { title: "Build it again, better", premise: "A second version needs a connected flow. Walk across the numbered pads in order: 1, 2, then 3.", lesson: "The public V2 project uses Next.js and shadcn. Here, connecting steps is a playful metaphor for an improved activity workflow.", mode: "sequence" },
  web3app: { title: "Into unfamiliar territory", premise: "Explore a new idea without rushing. Connect the three research pads in order to wake the observatory.", lesson: "This is a fictional research puzzle inspired by the web3app repository. No wallet, transaction or financial action is involved.", mode: "sequence" },
  "binance-alpha-tool": { title: "Signal, not noise", premise: "Useful signals are scattered around the garden. Find the three warm lights and gather them at this chapter.", lesson: "A tool can turn scattered information into something easier to explore. Open the source to see what this public project actually does.", mode: "collect" },
  myport: { title: "Make the work a world", premise: "The final exhibit needs its stories. Carry three little memory books to the display stand.", lesson: "You are inside this project: a portfolio where real repositories become places to visit. The next chapter is still yours to build.", mode: "deliver" },
};

export function storyFor(project: Project): StoryBeat {
  return stories[project.name] ?? { title: project.name, premise: "Gather three ideas around this workshop to discover its story.", lesson: project.description, mode: "collect" };
}

export const GARDEN_LEGACY_STORAGE_KEY = "ohaki-garden-stories-v1";
export const GARDEN_SESSION_STORAGE_KEY = "ohaki-garden-session-v2";
export const GARDEN_SESSION_VERSION = 2;
export const GARDEN_TARGET_COUNT = 3;

export type GardenCommand =
  | "bloom" | "cancel" | "home" | "jump" | "light" | "motion-full" | "motion-system"
  | "resume" | "start" | "wave"
  | "left" | "right" | "up" | "down"
  | `${"left" | "right" | "up" | "down"}-up`
  | `target:${number}` | `tour:${number}` | `visit:${number}`;

const gardenCommandNames = new Set<string>([
  "bloom", "cancel", "home", "jump", "light", "motion-full", "motion-system", "resume", "start", "wave",
  "left", "right", "up", "down", "left-up", "right-up", "up-up", "down-up",
]);

export function isGardenCommand(value: unknown): value is GardenCommand {
  if (typeof value !== "string") return false;
  return gardenCommandNames.has(value) || /^(target|tour|visit):-?\d+$/.test(value);
}

/** Shared producer contract for the existing DOM event channel. */
export function sendGardenCommand(detail: GardenCommand): void {
  window.dispatchEvent(new CustomEvent("ohaki:garden", { detail }));
}

export type GardenProjectRef = { name: string; mode: StoryBeat["mode"] };
export type GardenActiveSave = {
  project: string;
  mode: StoryBeat["mode"];
  progress: number;
  carrying: boolean;
  collected: number[];
};
export type GardenSave = {
  version: typeof GARDEN_SESSION_VERSION;
  completed: string[];
  active: GardenActiveSave | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export function uniqueProjectNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((name): name is string => typeof name === "string" && name.length > 0))];
}

function parseStorage(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw) as unknown; } catch { return null; }
}

function isStoryMode(value: unknown): value is StoryBeat["mode"] {
  return value === "collect" || value === "sequence" || value === "deliver";
}

function normalizeActive(value: unknown, projects: readonly GardenProjectRef[]): GardenActiveSave | null {
  if (!isRecord(value) || typeof value.project !== "string" || !value.project || !isStoryMode(value.mode)) return null;
  const project = projects.find(candidate => candidate.name === value.project);
  if (
    (project && value.mode !== project.mode)
    || typeof value.progress !== "number"
    || !Number.isInteger(value.progress)
    || value.progress < 0
    || value.progress >= GARDEN_TARGET_COUNT
    || typeof value.carrying !== "boolean"
    || !Array.isArray(value.collected)
  ) return null;
  const collected = value.collected as unknown[];
  if (
    collected.some(target => !Number.isInteger(target) || (target as number) < 0 || (target as number) >= GARDEN_TARGET_COUNT)
    || new Set(collected).size !== collected.length
  ) return null;
  if (value.mode === "deliver") {
    if (collected.length !== 0) return null;
  } else if (
    value.carrying !== false
    || collected.length !== value.progress
    || (value.mode === "sequence" && collected.some((target, index) => target !== index))
  ) return null;
  return {
    project: value.project,
    mode: value.mode,
    progress: value.progress,
    carrying: value.carrying,
    collected: collected as number[],
  };
}

/** Reads both generations without ever asking the old v1 key to hold an object. */
export function readGardenSave(sessionRaw: string | null, legacyRaw: string | null, projects: readonly GardenProjectRef[]): GardenSave {
  const legacy = parseStorage(legacyRaw);
  const session = parseStorage(sessionRaw);
  const sessionRecord = isRecord(session) ? session : null;
  const completed = uniqueProjectNames(legacy).concat(uniqueProjectNames(sessionRecord?.completed));
  const mergedCompleted = [...new Set(completed)];
  return {
    version: GARDEN_SESSION_VERSION,
    completed: mergedCompleted,
    active: sessionRecord?.version === GARDEN_SESSION_VERSION
      ? normalizeActive(sessionRecord.active, projects)
      : null,
  };
}

export function serializeGardenSave(save: GardenSave): string {
  return JSON.stringify({
    version: GARDEN_SESSION_VERSION,
    completed: uniqueProjectNames(save.completed),
    active: save.active,
  });
}

export function serializeLegacyCompletions(completed: readonly string[]): string {
  return JSON.stringify(uniqueProjectNames(completed));
}

export type GardenState = {
  nearby: number;
  active: number;
  progress: number;
  carrying: boolean;
  collected: number[];
  completed: string[];
  completedProject: number | null;
  guiding: number | null;
  message: string;
  storage: boolean;
  resumable: boolean;
  resumeProject: number | null;
};
export const initialGardenState: GardenState = {
  nearby: -1,
  active: -1,
  progress: 0,
  carrying: false,
  collected: [],
  completed: [],
  completedProject: null,
  guiding: null,
  message: "Walk to a numbered workshop. Press E to begin its story.",
  storage: true,
  resumable: false,
  resumeProject: null,
};

export function stationPosition(index: number): [number, number] {
  return [(index % 3 - 1) * 13, Math.floor(index / 3) * 16 - 9];
}
