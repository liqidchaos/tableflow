import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { withSentryConfig } from '@sentry/nextjs';

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');

// Load shared secrets from repo root (.env.local) before Next.js reads app-local overrides.
loadEnvConfig(monorepoRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tableflow/types', '@tableflow/db', '@tableflow/ui'],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: {
    disable: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: false,
  },
});
