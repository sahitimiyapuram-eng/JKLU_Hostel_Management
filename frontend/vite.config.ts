
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const modules = path.resolve(import.meta.dirname, 'node_modules');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    modules: [modules],
    alias: [
      {
        find: /^react\/jsx-runtime$/,
        replacement: path.join(modules, 'react/jsx-runtime.js'),
      },
      {
        find: /^react-dom\/client$/,
        replacement: path.join(modules, 'react-dom/client.js'),
      },
      {
        find: /^react$/,
        replacement: path.join(modules, 'react/index.js'),
      },
      {
        find: /^react-dom$/,
        replacement: path.join(modules, 'react-dom/index.js'),
      },
      {
        find: '@',
        replacement: path.resolve(import.meta.dirname, '../src'),
      },
    ],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
