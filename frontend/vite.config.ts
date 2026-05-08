import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
 
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Preserve the original Host header so Flask sets the cookie for the correct domain
            proxyReq.removeHeader('host')
            proxyReq.setHeader('host', req.headers.host)
          })
        }
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.removeHeader('host')
            proxyReq.setHeader('host', req.headers.host)
          })
        }
      }
    }
  },
  build: {
    outDir: '../app/static',
    emptyOutDir: true
  }
})
