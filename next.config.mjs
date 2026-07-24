import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // 显式别名，确保 @/lib/geo 等路径在 webpack 解析（不依赖 tsconfig paths 被 Next 采纳）
    config.resolve.alias['@'] = __dirname;
    return config;
  },
};

export default nextConfig;
