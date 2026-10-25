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
