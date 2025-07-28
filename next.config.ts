import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
   webpack: (config, { isServer }) => {
    // Externe Abhängigkeiten für pdfjs-dist auf dem Server bündeln
    if (isServer) {
        config.externals.push('canvas');
    }
    config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist/build/pdf';
    return config;
  },
};

export default nextConfig;
