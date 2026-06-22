import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_FILES = [
  "dist/index.html",
  "public/ort/ort-wasm-simd-threaded.asyncify.mjs",
  "public/ort/ort-wasm-simd-threaded.asyncify.wasm",
  "public/models/mediapipe/face_landmarker.task",
  "public/models/mediapipe/wasm/vision_wasm_internal.js",
  "public/models/mediapipe/wasm/vision_wasm_internal.wasm",
  "local-models/rmbg1.4/model_fp16.onnx",
  "local-models/rmbg1.4/model_quantized.onnx",
];

async function assertFile(relativePath) {
  const absolutePath = path.resolve(relativePath);

  try {
    const stats = await stat(absolutePath);

    if (!stats.isFile()) {
      throw new Error(`${relativePath} n'est pas un fichier.`);
    }

    return stats.size;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`Fichier requis absent : ${relativePath}`);
    }

    throw error;
  }
}

export async function verifyReleaseAssets() {
  const sizes = new Map();

  for (const relativePath of REQUIRED_FILES) {
    sizes.set(relativePath, await assertFile(relativePath));
  }

  await access("electron/main.cjs");
  await access("electron/launcher.cjs");

  return sizes;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const sizes = await verifyReleaseAssets();

    for (const [fileName, size] of sizes) {
      console.log(`${fileName} (${size} octets)`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(
      "Placez les modèles requis dans local-models/rmbg1.4/ avant de créer une release NAS.",
    );
    process.exit(1);
  }
}
