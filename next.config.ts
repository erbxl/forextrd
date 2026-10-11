import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/forextrd",
  images: { unoptimized: true },
  poweredByHeader: false,
};
export default config;
