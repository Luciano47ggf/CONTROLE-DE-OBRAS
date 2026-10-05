import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" }, // fotos vão direto ao Storage pelo navegador
  },
};

export default nextConfig;
