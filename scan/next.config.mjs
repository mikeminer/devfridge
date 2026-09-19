/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["@paragraph-com/sdk"] },
  images: { unoptimized: true },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  async rewrites() {
    return [
      { source: "/world/game-v2", destination: "/world/game-v2/index.html" },
      { source: "/world/android", destination: "/world/android/index.html" },
      { source: "/world/android/it", destination: "/world/android/it.html" },
      { source: "/world/android/privacy", destination: "/world/android/privacy.html" },
      { source: "/world/android/privacy-it", destination: "/world/android/privacy-it.html" },
      { source: "/world/android/rules", destination: "/world/android/rules.html" },
      { source: "/world/android/rules-it", destination: "/world/android/rules-it.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/world/game-v2",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/world/game-v2/index.html",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/world/game-v2/assets/gate-2.js",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/world/game-v2/assets/cold-storage.js",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/world/game-v2/assets/cold-storage.css",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
