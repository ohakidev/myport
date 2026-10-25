import assert from "node:assert/strict";
import { test } from "node:test";
import { ctaPressScale, navLineScale } from "./press-intent.ts";

test("the nav line is drawn for the current page or the link under the pointer", () => {
  assert.equal(navLineScale(true, false), 1);
  assert.equal(navLineScale(false, true), 1);
  assert.equal(navLineScale(false, false), 0);
});

test("a call to action presses in without a bounce past rest", () => {
  assert.equal(ctaPressScale(true), 0.98);
  assert.equal(ctaPressScale(false), 1);
});
