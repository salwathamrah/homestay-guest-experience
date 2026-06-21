import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its .afm font metrics files from disk at runtime via
  // relative paths from its own module directory — bundling it breaks
  // that lookup, so it must run via native require instead.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
