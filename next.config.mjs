/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app is a personal finance dashboard with no auth yet — keep it out of
  // search indexes so the URL isn't discoverable. Remove once auth is added.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
