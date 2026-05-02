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
      // Stub out packages that use node:fs / node:https internally —
      // no filesystem exists in Cloudflare Workers, so these can never
      // work on the edge. Routes that import them will throw at runtime
      // until replaced with edge-compatible alternatives.
      config.resolve.alias = {
        ...config.resolve.alias,
        pptxgenjs: false,
        "pdf-parse": false,
        mammoth: false,
        exceljs: false,
        // Prisma uses Node.js binary engines — not edge compatible
        "@prisma/client": false,
        ".prisma/client": false,
        prisma: false,
        // next-auth replaced by Clerk — remove entirely from edge bundle
        "next-auth": false,
        "next-auth/providers/credentials": false,
        "@auth/prisma-adapter": false,
        // pdf-lib uses node:buffer internals that aren't available on edge
        "pdf-lib": false,
      };
    }
    return config;
  },
};

export default nextConfig;
