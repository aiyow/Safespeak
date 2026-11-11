import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const proxy = {
  '/api': process.env.SAFESPEAK_API_TARGET || 'http://127.0.0.1:5000',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: 'localhost', port: 5173, strictPort: true, proxy },
  preview: { host: 'localhost', port: 5173, strictPort: true, proxy },
})
