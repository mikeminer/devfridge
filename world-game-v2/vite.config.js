import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/world/game-v2/",
  publicDir: "public",
  build: {
    target: "es2022",
    outDir: resolve("../scan/public/world/game-v2"),
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@dimforge/rapier3d-compat")) return "physics";
          if (id.includes("three")) return "three";
          if (id.includes("/src/wallet")) return "wallet";
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["@dimforge/rapier3d-compat"],
  },
});
