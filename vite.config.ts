import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? '/'
          // Skip assets, vite internals, and root (pitwall.html)
          if (url === '/') {
            req.url = '/pitwall.html'
            next()
            return
          }
          if (
            url.startsWith('/@') ||
            url.startsWith('/node_modules') ||
            url.startsWith('/src') ||
            url.startsWith('/css') ||
            url.startsWith('/js') ||
            url.startsWith('/img') ||
            url.startsWith('/game') ||
            url.includes('.')
          ) {
            next()
            return
          }
          // All social routes → serve app.html
          req.url = '/app.html'
          next()
        })
      },
    },
  ],
  root: '.',
  build: {
    outDir: 'dist/app',
    emptyOutDir: true,
    rollupOptions: {
      input: 'app.html',
    },
  },
  server: {
    open: '/app.html',
  },
})
