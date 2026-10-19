export const caseStudies = [
  {
    id: "myport",
    name: "Rooftop atelier",
    category: "Interactive portfolio",
    stack: "Next.js / TypeScript / Three.js",
    title: "A world to explore. A clear path to the work.",
    summary: "An optional 3D journey alongside a direct, readable portfolio. Both start with the same public GitHub data.",
    decision: "Make the scene a destination, not a prerequisite. Keep project information available without starting WebGL.",
    source: "https://github.com/ohakidev/myport",
    commit: "094abbe3d5e2759281ee8c37d2c7bff21c5cd4df",
    sourceNote: "Historical source snapshot. Its root route rendered Journey directly; this iteration separates Index, Work and Playground.",
    layers: [
      { label: "Public data", title: "One bounded data contract.", path: "src/lib/github.ts", detail: "The server fetches public profile and repository data before passing a typed portfolio to the interface.", tradeoff: "The current loader validates URLs and counts, caches requests and falls back to a saved snapshot. A saved response is explicitly labelled.", snapshot: "Profile and repository loader in the earlier snapshot." },
      { label: "Route handoff", title: "Reading first. Exploration by choice.", path: "src/app/page.tsx", detail: "The current Index and Work routes stand independently of the 3D renderer. Playground is an explicit opt-in at /play.", tradeoff: "More than one entry point, but no WebGL requirement to read the projects.", snapshot: "Earlier root route, before the reading / playground split." },
      { label: "Interaction state", title: "The interface owns the journey.", path: "src/components/journey.tsx", detail: "Journey coordinates project selection and the DOM interface while the world owns rendering.", tradeoff: "Scene and interface must share a clear handoff so overlays do not compete with movement controls.", snapshot: "Journey coordination in the pinned source." },
      { label: "Spatial runtime", title: "One renderer. One responsibility.", path: "src/components/journey/world.tsx", detail: "GameWorld renders the Three.js scene; project detail stays in the DOM for a readable interaction surface.", tradeoff: "The immersive route costs more GPU and JavaScript than the reading routes. It stays optional.", snapshot: "Three.js world implementation in the pinned source." },
    ],
  },
  {
    id: "stdactivitycheckV2",
    name: "Student activity system",
    category: "Workflow application",
    stack: "Next.js / TypeScript / MongoDB",
    title: "A response is not a reservation.",
    summary: "A university activity workflow that keeps publishing, form responses, bookings and on-site registration distinct.",
    decision: "Model the next action explicitly: a submitted form, a booked place and registered attendance are different states.",
    source: "https://github.com/ohakidev/stdactivitycheckV2",
    commit: "115d44772fd392d5f7a4600fc0ab4ccd5dfb4ea7",
    sourceNote: "Source-review observations, not production incidents. The README describes university use, not individual authorship or adoption metrics.",
    layers: [
      { label: "Publish", title: "Define the registration window.", path: "actions/ActivityAction.tsx#L203", detail: "CreateForm and PublishForm define the activity, form and registration schedule before students can participate.", tradeoff: "PublishForm checks for a session but does not invoke the admin-role guard used by other actions. Authentication alone is not role authorization.", snapshot: "PublishForm and its session gate." },
      { label: "Respond", title: "A submission starts the workflow.", path: "actions/ActivityAction.tsx#L287", detail: "SubmitForm saves a response and increments the submission count. It creates a booked participation record when one does not exist.", tradeoff: "These writes are sequential, not one transaction. A partial failure can leave a response, count and booking out of sync.", snapshot: "SubmitForm and the sequential writes." },
      { label: "Check in", title: "Guard the transition to attendance.", path: "actions/ActivityAction.tsx#L458", detail: "joinActivity checks a booking, an open registration window and reported proximity within 100 metres before registering attendance.", tradeoff: "Coordinates come from the caller. The check establishes reported proximity, not proof of physical presence.", snapshot: "joinActivity booking, time and location checks." },
      { label: "Record state", title: "Keep the outcome explicit.", path: "models/ActivityForm.js", detail: "The activity model preserves booking and registration as different participation states.", tradeoff: "A state model makes the workflow understandable, but does not by itself establish authorization, atomicity or production reliability.", snapshot: "Activity form and participation model." },
    ],
  },
] as const;

export type CaseStudy = (typeof caseStudies)[number];
export function caseSourceUrl(study: CaseStudy, path: string) {
  return `${study.source}/blob/${study.commit}/${path}`;
}
