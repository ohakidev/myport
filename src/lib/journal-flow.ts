/** Viewing a project from the open journal keeps that list on screen. */
export function journalStaysForProject(journalOpen: boolean) {
  return journalOpen;
}

/** A project sheet on top is not a request to dismiss the list under it. */
export function allowJournalDismiss(projectSheetPresent: boolean) {
  return !projectSheetPresent;
}
