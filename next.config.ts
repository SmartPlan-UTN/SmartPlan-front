import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The landing leans on large transparent hero cut-outs and full-bleed
    // photography; AVIF first cuts those bytes hard, WebP is the fallback
    // for browsers without AVIF.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
