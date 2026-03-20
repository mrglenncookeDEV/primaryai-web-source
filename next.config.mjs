/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@excalidraw/excalidraw"],
  experimental: {
    optimizePackageImports: ["react-icons"],
    staleTimes: {
      // Next.js 15 defaults dynamic to 0 (no cache), which forces a
      // server refetch on every back/forward navigation. Set to 60s
      // so navigating back is instant as long as the user was on that
      // page within the last minute.
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
