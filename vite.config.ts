import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["onnxruntime-web-use-extern-wasm"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
