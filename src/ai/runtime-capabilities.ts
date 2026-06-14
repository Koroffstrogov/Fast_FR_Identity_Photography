import {
  BackgroundRemovalActiveBackend,
  BackgroundRemovalBackendPreference,
} from "../core/photo-project";

export type RuntimeCapabilities = {
  navigatorGpuAvailable: boolean;
};

export type BackendAttempt = {
  activeBackend: Exclude<BackgroundRemovalActiveBackend, "none">;
  provider: "webgpu" | "wasm";
};

export type BackendResolution = {
  requestedBackend: BackgroundRemovalBackendPreference;
  attempts: BackendAttempt[];
  warning?: string;
  error?: string;
};

export function getRuntimeCapabilities(
  navigatorLike: Pick<Navigator, "userAgent"> | undefined = getNavigator(),
): RuntimeCapabilities {
  return {
    navigatorGpuAvailable: hasNavigatorGpu(navigatorLike),
  };
}

export function hasNavigatorGpu(
  navigatorLike: Pick<Navigator, "userAgent"> | undefined = getNavigator(),
): boolean {
  return Boolean((navigatorLike as { gpu?: unknown } | undefined)?.gpu);
}

export function resolveBackgroundBackend(
  requestedBackend: BackgroundRemovalBackendPreference,
  capabilities: RuntimeCapabilities,
): BackendResolution {
  if (requestedBackend === "cpu") {
    return {
      requestedBackend,
      attempts: [{ activeBackend: "wasm", provider: "wasm" }],
    };
  }

  if (requestedBackend === "gpu") {
    if (!capabilities.navigatorGpuAvailable) {
      return {
        requestedBackend,
        attempts: [],
        error:
          "WebGPU indisponible dans ce navigateur. Selectionnez CPU pour utiliser ONNX Runtime WASM.",
      };
    }

    return {
      requestedBackend,
      attempts: [{ activeBackend: "webgpu", provider: "webgpu" }],
    };
  }

  if (!capabilities.navigatorGpuAvailable) {
    return {
      requestedBackend,
      attempts: [{ activeBackend: "wasm", provider: "wasm" }],
      warning:
        "WebGPU indisponible. Le mode Auto utilise le backend CPU/WASM.",
    };
  }

  return {
    requestedBackend,
    attempts: [
      { activeBackend: "webgpu", provider: "webgpu" },
      { activeBackend: "wasm", provider: "wasm" },
    ],
  };
}

function getNavigator(): Pick<Navigator, "userAgent"> | undefined {
  return typeof navigator === "undefined" ? undefined : navigator;
}
