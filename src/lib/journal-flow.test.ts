import assert from "node:assert/strict";
import { test } from "node:test";
import { allowJournalDismiss, journalStaysForProject } from "./journal-flow.ts";

test("the journal list stays open when a project is viewed from it", () => {
  assert.equal(journalStaysForProject(true), true);
  assert.equal(journalStaysForProject(false), false);
});

test("the project sheet does not count as closing the journal", () => {
  assert.equal(allowJournalDismiss(true), false);
  assert.equal(allowJournalDismiss(false), true);
});
