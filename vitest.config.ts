import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      // Testes nunca chamam o serviço de importação real, mesmo com VITE_IMPORT_API_URL no .env.local
      env: { VITE_IMPORT_API_URL: '' },
    },
  }),
);
