/** The work address already names the study. The filter should follow it. */
export function workFilterFromHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (id === "myport") return "myport";
  if (id === "activity") return "stdactivitycheckV2";
  return "all";
}

export function hashForWorkFilter(filter: string) {
  if (filter === "myport") return "#myport";
  if (filter === "stdactivitycheckV2") return "#activity";
  return "";
}

/** Runs while the work HTML is parsed, before the first paint. */
export const workFilterBootScript = `(() => {
  const workFilterFromHash = ${workFilterFromHash.toString()};
  const id = workFilterFromHash(location.hash);
  document.querySelectorAll("[data-work-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", button.getAttribute("data-filter-id") === id ? "true" : "false");
  });
  const sectionId = id === "stdactivitycheckV2" ? "activity" : id === "myport" ? "myport" : "";
  document.querySelectorAll("[data-case]").forEach((section) => {
    if (sectionId && section.id !== sectionId) section.setAttribute("hidden", "");
    else section.removeAttribute("hidden");
  });
})();`;
