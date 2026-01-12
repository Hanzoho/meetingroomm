/** @type {import('next').NextConfig} */
const nextConfig = {
  // ปรับปรุง Performance และป้องกันการค้าง
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Image Optimization - ป้องกันการกระตุก
  images: {
    minimumCacheTTL: 86400, // 24 ชั่วโมง
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Experimental Features
  experimental: {
    // optimizeCss: true, // ปิดเพื่อแก้ปัญหา critters
    optimizeServerReact: true,
  },

  // Performance
  poweredByHeader: false,
  reactStrictMode: true,
  
  // การโหลดที่เร็วขึ้น
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
