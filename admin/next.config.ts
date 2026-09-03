import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // The Expo app at the repository root has its own lockfile, so Turbopack
  // otherwise infers C:\nilya as the workspace root and warns.
  turbopack: { root: import.meta.dirname },
  images: {
    // `listing-images` and `avatars` are public buckets (see
    // supabase/migrations/20260812120621_sawa_storage_buckets.sql), so object
    // URLs resolve without signing.
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
