/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "auwbrydulogqlscfymbg.supabase.co",
      },
    ],
  },
};

export default nextConfig;
