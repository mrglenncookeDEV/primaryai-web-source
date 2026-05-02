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
  webpack: (config, { nextRuntime, webpack }) => {
    if (nextRuntime === "edge") {
      // Strip the "node:" prefix from all imports so webpack's edge bundler
      // can resolve them. Cloudflare's nodejs_compat flag provides the
      // runtime implementations. Modules with no edge equivalent (fs, https)
      // get webpack's empty browser stub — routes depending on them will
      // throw at runtime until replaced with edge-compatible alternatives.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      // Stub out packages that use node:fs internally and can never work
      // on the edge (no filesystem in Cloudflare Workers).
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
