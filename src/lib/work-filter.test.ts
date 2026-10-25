import assert from "node:assert/strict";
import { test } from "node:test";
import { hashForWorkFilter, workFilterFromHash } from "./work-filter.ts";

test("a case-study link opens that study instead of asking again", () => {
  assert.equal(workFilterFromHash("#myport"), "myport");
  assert.equal(workFilterFromHash("#activity"), "stdactivitycheckV2");
  assert.equal(workFilterFromHash(""), "all");
  assert.equal(workFilterFromHash("#about"), "all");
});

test("the work filter keeps the same address the case-study link uses", () => {
  assert.equal(hashForWorkFilter("myport"), "#myport");
  assert.equal(hashForWorkFilter("stdactivitycheckV2"), "#activity");
  assert.equal(hashForWorkFilter("all"), "");
});
