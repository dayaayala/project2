import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use your GitHub repo name. If the repo is "project2", base is '/project2/'
// If your repo is "Daya-UV-Index" or something else, change it to '/Daya-UV-Index/'
export default defineConfig({
  plugins: [react()],
  base: '/project2/',
})
