import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0a0e1a",
        card: "#0f1629",
        line: "#1e2d4a",
        ice: "#4fc3f7",
        fridge: "#0d2137",
        safe: "#22c55e",
        caution: "#eab308",
        danger: "#ef4444",
        ink: "#e2e8f0",
        mute: "#94a3b8",
      },
      fontFamily: {
        sans: ["var(--font-space)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        ice: "0 0 40px rgba(79, 195, 247, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
