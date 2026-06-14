import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { rmbg2LocalModelPlugin } from "./vite.rmbg-model";

export default defineConfig({
  plugins: [rmbg2LocalModelPlugin(), react()],
  resolve: {
    conditions: ["onnxruntime-web-use-extern-wasm"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
