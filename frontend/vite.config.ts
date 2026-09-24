import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const apiBaseUrl = process.env.VITE_API_BASE_URL

  // A production build without VITE_API_BASE_URL would call http://localhost:5000
  // from users' browsers. Warn loudly so it is caught in the Vercel build log.
  if (mode === 'production' && !apiBaseUrl) {
    console.warn('\n[planpal] VITE_API_BASE_URL is not set: the build will call http://localhost:5000.\n' +
      '          Set it to the backend URL (https://...) in the hosting environment.\n')
  }

  return {
    plugins: [react()],
    server: {
      // 5173 matches the backend's default ALLOWED_ORIGINS and the README
      port: 5173,
      open: true
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl || 'http://localhost:5000')
    }
  }
})
