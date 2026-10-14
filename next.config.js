const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets the live app be embedded in Canva / Slides.com presentations.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' file: http://localhost:* https://*.canva.com https://canva.com https://*.slides.com;",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOW-FROM https://canva.com", // Fallback for older browsers
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
