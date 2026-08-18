import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ["buffer"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    react(),
    {
      name: "ipfs-html",
      transformIndexHtml(html) {
        return html
          .replaceAll(" crossorigin", "")
          .replaceAll(' crossorigin=""', "")
          .replace('<script type="module" src="./assets/', '<script defer src="./assets/');
      },
    },
    {
      name: "no-bare-imports",
      generateBundle(_opts, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== "chunk") continue;
          if (/\bfrom\s*["']buffer["']/.test(file.code) || /\bimport\s*["']buffer["']/.test(file.code)) {
            throw new Error(
              `${file.fileName} still contains a bare "buffer" import — browsers cannot resolve it`
            );
          }
        }
      },
    },
  ],
  base: "./",
  define: {
    global: "globalThis",
  },
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        name: "FridgeApp",
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
