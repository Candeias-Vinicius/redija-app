import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'tiptap-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-underline',
            '@tiptap/extension-superscript',
            '@tiptap/extension-subscript',
            '@tiptap/extension-placeholder',
          ],
          'storage-vendor': ['dexie'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
