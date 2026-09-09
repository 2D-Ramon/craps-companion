import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: path.join(__dirname),
  },
  allowedDevOrigins: [
    "192.168.1.159",
    "127.0.0.1",
    "localhost",
    "https://192.168.1.159",
    "https://192.168.1.159:3000",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
