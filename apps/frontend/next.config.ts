import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Скрыть N-индикатор в углу (мешает в Electron-оверлее)
  devIndicators: false,
};

export default nextConfig;
