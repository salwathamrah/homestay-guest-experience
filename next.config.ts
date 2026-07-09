import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its .afm font metrics files from disk at runtime via
  // relative paths from its own module directory — bundling it breaks
  // that lookup, so it must run via native require instead.
  serverExternalPackages: ["pdfkit"],
  experimental: {
    serverActions: {
      // Aadhaar front+back for up to 3 guests can reach ~15 MB combined.
      // Default is 1 MB which rejects the upload before the action runs.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
