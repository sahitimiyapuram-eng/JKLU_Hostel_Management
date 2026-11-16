
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;
const modules = path.resolve(root, 'node_modules');

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
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
        find: /^lucide-react$/,
        replacement: path.join(
          modules,
          'lucide-react/dist/esm/lucide-react.js'
        ),
      },
      {
        find: '@',
        replacement: path.resolve(root, '../src'),
      },
    ],
  },

  server: {
    fs: {
      allow: ['..'],
    },
  },
});
