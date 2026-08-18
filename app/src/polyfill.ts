import { Buffer } from "buffer";

const g = globalThis as typeof globalThis & {
  Buffer: typeof Buffer;
  global: typeof globalThis;
  process?: { env: Record<string, string> };
};

g.Buffer = Buffer;
g.global = g;
g.process = g.process || { env: { NODE_ENV: "production" } };

export {};
