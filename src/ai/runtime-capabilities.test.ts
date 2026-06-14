import { describe, expect, it } from "vitest";
import {
  getRuntimeCapabilities,
  hasNavigatorGpu,
  resolveBackgroundBackend,
} from "./runtime-capabilities";

describe("runtime capabilities", () => {
  it("detects WebGPU from navigator.gpu", () => {
    expect(hasNavigatorGpu({ userAgent: "test", gpu: {} } as Navigator)).toBe(true);
    expect(hasNavigatorGpu({ userAgent: "test" } as Navigator)).toBe(false);
  });

  it("resolves CPU to WASM only", () => {
    const resolution = resolveBackgroundBackend("cpu", {
      navigatorGpuAvailable: true,
    });

    expect(resolution.attempts).toEqual([
      { activeBackend: "wasm", provider: "wasm" },
    ]);
  });

  it("resolves auto to GPU then CPU when WebGPU is available", () => {
    const resolution = resolveBackgroundBackend("auto", {
      navigatorGpuAvailable: true,
    });

    expect(resolution.attempts.map((attempt) => attempt.provider)).toEqual([
      "webgpu",
      "wasm",
    ]);
  });

  it("returns a clear GPU error when WebGPU is unavailable", () => {
    const resolution = resolveBackgroundBackend("gpu", {
      navigatorGpuAvailable: false,
    });

    expect(resolution.attempts).toEqual([]);
    expect(resolution.error).toContain("WebGPU indisponible");
  });

  it("reports the current navigator capabilities", () => {
    expect(getRuntimeCapabilities({ userAgent: "test", gpu: {} } as Navigator)).toEqual({
      navigatorGpuAvailable: true,
    });
  });
});
