import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local QA builds separate from a developer's running Next server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // The landing leans on large transparent hero cut-outs and full-bleed
    // photography; AVIF first cuts those bytes hard, WebP is the fallback
    // for browsers without AVIF.
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // Historial became "Mis salidas" (#130). Answered before rendering so
      // saved links and bookmarks land on the new screen right away.
      { source: "/history", destination: "/outings", permanent: false },
    ];
  },
};

export default nextConfig;
