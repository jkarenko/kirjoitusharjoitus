import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Handwriting Exercise Game',
        short_name: 'Handwriting',
        description: 'A gamified handwriting practice application for children',
        theme_color: '#4a6fb5',
        background_color: '#f5f7fa',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true, // Expose to all network interfaces
    port: 3000,
    open: true, // Open browser on server start
    cors: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['src/services/AudioManager.ts', 'src/services/StorageManager.ts'],
          game: ['src/core/GameManager.ts', 'src/core/DrawingManager.ts', 'src/core/ScoreManager.ts'],
        },
      },
    },
  },
  optimizeDeps: {
    include: [], // Add any dependencies that need to be pre-bundled
  },
});

