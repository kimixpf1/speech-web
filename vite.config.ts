import path from "path"
import { execSync } from "node:child_process"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

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
  plugins: [inspectAttr(), react()],
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
