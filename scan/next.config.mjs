/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["@paragraph-com/sdk"] },
  images: { unoptimized: true },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  async rewrites() {
    return [
      { source: "/world/game-v2", destination: "/world/game-v2/index.html" },
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
    ];
  },
};

export default nextConfig;
