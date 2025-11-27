/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions are enabled by default in Next.js 14+
  // Disable Vercel Analytics to prevent ERR_BLOCKED_BY_CLIENT errors
  // Analytics can be re-enabled via Vercel dashboard if needed
  experimental: {
    instrumentationHook: false,
  },
}

module.exports = nextConfig

