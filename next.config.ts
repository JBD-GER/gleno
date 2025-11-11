/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
  // devIndicators ist optional; kannst du lassen oder entfernen
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dnilrjrvekjikaojruwf.supabase.co',
        pathname: '/storage/v1/object/public/**', // alle Public-Buckets & Pfade
      },
    ],
  },
}

module.exports = nextConfig
