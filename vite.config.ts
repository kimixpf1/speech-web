import path from "path"
import { execSync } from "node:child_process"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { VitePWA } from 'vite-plugin-pwa'

const appVersion = process.env.npm_package_version ?? '0.0.0'
const appCommitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'local'
  }
})()
const appBuildTime = new Date().toISOString()

export default defineConfig({
  base: '/speech-web/',
  plugins: [
    inspectAttr(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: '/speech-web/',
      scope: '/speech-web/',
      includeAssets: ['robots.txt', 'share-cover.svg'],
      manifest: {
        name: '重要讲话学习平台',
        short_name: '重要讲话',
        description: '习近平总书记重要讲话与文章',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/speech-web/',
        start_url: '/speech-web/',
        icons: [
          { src: 'share-cover.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/speech-web/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_COMMIT_HASH__: JSON.stringify(appCommitHash),
    __APP_BUILD_TIME__: JSON.stringify(appBuildTime),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-swr': ['swr'],
          'vendor-icons': ['lucide-react'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-progress',
            '@radix-ui/react-slot',
          ],
          'vendor-export': ['docx', 'file-saver'],
          'vendor-tts': ['onnxruntime-web', '@mintplex-labs/piper-tts-web'],
        },
      },
    },
  },
});
