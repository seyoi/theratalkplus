import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // 빌드 중 ESLint 오류 무시
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: "/(.*)", // 모든 경로에 대해 설정
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self';", // unsafe-eval 제거
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // 모든 출처에 대해 CORS 허용
          },
        ],
      },
    ];
  },
};

export default nextConfig;
