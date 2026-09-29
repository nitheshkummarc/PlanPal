import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Same sources Vite uses for import.meta.env: .env files and the process environment
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  if (mode === 'production' && !env.VITE_API_BASE_URL) {
    console.warn('\n[planpal] VITE_API_BASE_URL is not set: the build will call http://localhost:5000.\n' +
      '          Set it to the backend URL (https://...) in the hosting environment.\n')
  }

  return {
    plugins: [react()],
    server: {
      // Matches the backend's default ALLOWED_ORIGINS
      port: 5173,
      open: true
    }
  }
})
