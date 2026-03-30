import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel serves the app at the site root. GitHub Pages uses /<repo-name>/.
const base = process.env.VERCEL ? '/' : '/projecttwo/'

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    open: base,
  },
})
