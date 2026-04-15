import withPWAInit from "@ducanh2912/next-pwa";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disables PWA in dev mode so it doesn't cache aggressively while you are coding
  register: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default withPWA(nextConfig);