import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { rmbgLocalModelPlugin } from "./vite.rmbg-model";

export default defineConfig({
  plugins: [rmbgLocalModelPlugin(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
