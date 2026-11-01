import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` makes every URL relative, so the same build works at
// https://<you>.github.io/<repo>/ (GitHub Pages) or at a domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __PWA__: 'true' },
  build: { outDir: 'dist', sourcemap: false, target: 'es2020' },
});
