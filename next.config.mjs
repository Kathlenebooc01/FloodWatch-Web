/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: false,
  serverExternalPackages: ['pdfkit'],
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xncciaozzxoqbesfxpww.supabase.co').hostname,
      pathname: '/storage/v1/object/**',
    }],
  },
};

export default nextConfig;
