import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy image files served by the .NET API's wwwroot/images/
      '/images': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
