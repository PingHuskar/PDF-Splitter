import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Offline after the first load: every build asset (including the pdf.js worker .mjs and
    // the lazily loaded thumbs chunk) is precached; mjs must be listed explicitly.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'PDF Splitter',
        short_name: 'PDF Splitter',
        description: 'Split a PDF into smaller PDFs right in your browser — the file never leaves your device.',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,mjs,svg}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
})
