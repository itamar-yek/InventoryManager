/**
 * Vite Configuration for Inventory Manager Frontend
 *
 * Configured for offline deployment - no external CDN dependencies.
 * All assets are bundled locally.
 *
 * Environment variables (optional):
 *   VITE_DEV_PORT - Development server port (default: 3000)
 *   VITE_API_URL - Backend API URL for dev proxy (default: http://localhost:8000)
 */
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Configuration can be customized via environment variables
const DEV_PORT = parseInt(process.env.VITE_DEV_PORT || '3000', 10)
const API_URL = process.env.VITE_API_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: DEV_PORT,
    host: true, // Listen on all network interfaces
    proxy: {
      '/api': {
        target: API_URL,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Ensure all assets are bundled, no external URLs
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
