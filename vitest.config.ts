import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: process.env.LIVE ? ["test/**/*.live.test.ts"] : ["src/**/*.test.ts"],
    testTimeout: 300_000,
  },
});
