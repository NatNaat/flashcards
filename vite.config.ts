import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/flashcards/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // The UI fonts and illustrations are part of the offline experience, so they are
        // precached alongside the app shell. KaTeX's ~59 font files are deliberately left
        // out: they are only needed by cards that actually use LaTeX, so they are fetched
        // and cached on first use instead of bloating every install.
        globPatterns: [
          '**/*.{js,css,html,ico,png,webmanifest}',
          'illustrations/*.svg',
          'assets/manrope-*.woff2',
          'assets/baloo-2-*.woff2',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/KaTeX_.*\.(?:woff2|woff|ttf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'katex-fonts',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: 'Flashcards',
        short_name: 'Flashcards',
        description: 'Répétition espacée, en mieux.',
        theme_color: '#14161d',
        background_color: '#14161d',
        display: 'standalone',
        start_url: '/flashcards/',
        scope: '/flashcards/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
