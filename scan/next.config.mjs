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
};

export default nextConfig;
