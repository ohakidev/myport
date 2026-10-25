import assert from "node:assert/strict";
import { test } from "node:test";
import { inkScale } from "./ink-scale.ts";

test("scroll progress draws the signature rule from empty to full", () => {
  assert.equal(inkScale(0), 0);
  assert.equal(inkScale(0.25), 0.25);
  assert.equal(inkScale(1), 1);
});

test("progress outside the scroll range stays on the rule", () => {
  assert.equal(inkScale(-0.4), 0);
  assert.equal(inkScale(1.8), 1);
});

test("a missing progress leaves the rule fully drawn", () => {
  assert.equal(inkScale(Number.NaN), 1);
  assert.equal(inkScale(Number.POSITIVE_INFINITY), 1);
});
