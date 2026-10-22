const isDemoMode = process.env.DEMO_MODE !== 'false'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    if (!isDemoMode) return []
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
}

export default nextConfig
