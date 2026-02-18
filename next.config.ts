import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      '@react-pdf/renderer': '@react-pdf/renderer/lib/react-pdf.browser.cjs.js',
    },
  },
};

export default nextConfig;
