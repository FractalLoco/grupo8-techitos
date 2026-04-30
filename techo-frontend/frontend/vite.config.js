import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // pre-bundle las dependencias más pesadas para optimizar
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
