import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { institutionalPagesPlugin } from './scripts/vitePluginInstitutionalPages.ts';

const projectRoot = import.meta.dirname;
const fsAllowList = [searchForWorkspaceRoot(projectRoot), projectRoot];
try {
  const realNodeModules = fs.realpathSync(path.resolve(projectRoot, 'node_modules'));
  if (!fsAllowList.includes(realNodeModules)) {
    fsAllowList.push(realNodeModules);
  }
} catch {
  // Ignora se node_modules ainda não existir
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    institutionalPagesPlugin(projectRoot),
    {
      name: 'dev-api-feedback-mock',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/feedback' && req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, mock: true, message: 'Dev mock response' }));
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'tiptap-vendor',
              test: /node_modules[\\/]@tiptap[\\/]/,
            },
            {
              name: 'storage-vendor',
              test: /node_modules[\\/]dexie[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
    fs: {
      allow: fsAllowList,
    },
  },
});
