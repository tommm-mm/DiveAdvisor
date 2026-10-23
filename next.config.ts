import type { NextConfig } from "next";

// Centre photos are served from Supabase Storage; next/image resizes them per device.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/center-photos/**" }]
      : [],
  },
};

export default nextConfig;
