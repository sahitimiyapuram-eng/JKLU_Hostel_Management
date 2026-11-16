
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(import.meta.dirname, '../src'),
      },
      {
        find: 'react-dom/client',
        replacement: path.resolve(import.meta.dirname, 'node_modules/react-dom/client.js'),
      },
    ],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
