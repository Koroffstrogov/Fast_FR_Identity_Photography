import { existsSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MODEL_PATH = "local-models/rmbg1.4/model_fp16.onnx";
const hasRealModel = existsSync(MODEL_PATH);

describe.skipIf(!hasRealModel)("RMBG-1.4 real model asset", () => {
  it("is available for manual ONNX validation", () => {
    expect(statSync(MODEL_PATH).size).toBeGreaterThan(1024);
  });
});
