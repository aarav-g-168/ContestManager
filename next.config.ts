import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true"
    ? { distDir: ".next-profile-test" }
    : {}),
};

export default nextConfig;
