import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './', // Ensures relative paths for assets
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: false, // Prevent deleting worker.js if built earlier
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          monaco: ['@monaco-editor/react'],
          ui: ['lucide-react', 'framer-motion']
        }
      }
    }
  }
});