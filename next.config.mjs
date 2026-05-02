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
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === "edge") {
      // pptxgenjs, pdf-parse, mammoth, exceljs all use node:fs / node:https
      // which don't exist in Cloudflare's edge runtime. Stub them out so
      // the build compiles — those routes will throw at runtime until
      // replaced with edge-compatible alternatives.
      config.resolve.alias = {
        ...config.resolve.alias,
        pptxgenjs: false,
        "pdf-parse": false,
        mammoth: false,
        exceljs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
