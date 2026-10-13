import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "development" &&
  process.env.PROFILE_TEST_MODE === "true"
    ? { distDir: ".next-profile-test" }
    : {}),
};

export default nextConfig;
