import assert from "node:assert/strict";
import { test } from "node:test";
import { layerFillBox } from "./layer-fill.ts";

const list = { left: 40, top: 200 };

test("the layer fill sits on the selected control", () => {
  assert.deepEqual(layerFillBox(list, { left: 40, top: 200, width: 180, height: 120 }), {
    x: 0,
    y: 0,
    width: 180,
    height: 120,
  });
});

test("a later layer moves the fill across the row", () => {
  assert.deepEqual(layerFillBox(list, { left: 220, top: 200, width: 180, height: 120 }), {
    x: 180,
    y: 0,
    width: 180,
    height: 120,
  });
});

test("a wrapped layer moves the fill down to that control", () => {
  assert.deepEqual(layerFillBox(list, { left: 40, top: 320, width: 180, height: 96 }), {
    x: 0,
    y: 120,
    width: 180,
    height: 96,
  });
});
