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
      name: "token-logo-dev",
      configureServer(server) {
        server.middlewares.use("/api/token-logo", (req, res) => {
          void (async () => {
            try {
              const host = req.headers.host || "127.0.0.1";
              const url = new URL(req.url || "/", `http://${host}`);
              const cid = url.searchParams.get("cid") || "";
              const src = cid
                ? `https://w3s.link/ipfs/${cid}`
                : url.searchParams.get("url") || "";
              if (!src) {
                res.statusCode = 400;
                res.end("missing");
                return;
              }
              const upstream = await fetch(src, {
                headers: { accept: "image/*", "user-agent": "DevFridge/1.0" },
              });
              if (!upstream.ok) {
                res.statusCode = upstream.status;
                res.end("upstream");
                return;
              }
              const type = upstream.headers.get("content-type") || "image/webp";
              const buf = Buffer.from(await upstream.arrayBuffer());
              res.setHeader("content-type", type);
              res.setHeader("cache-control", "public, max-age=3600");
              res.end(buf);
            } catch {
              res.statusCode = 502;
              res.end("fail");
            }
          })();
        });
      },
    },
    {
      name: "ipfs-html",
      transformIndexHtml(html) {
        const stamped = html
          .replaceAll(" crossorigin", "")
          .replaceAll(' crossorigin=""', "")
          .replace('<script type="module" src="./assets/', '<script defer src="./assets/');
        return stamped.replace(
          /src="(\.\/assets\/app\.js)"/g,
          `src="$1?v=${Date.now()}"`
        );
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
