// Importo defineConfig para que Vite tenga autocompletado y validación de opciones
import { defineConfig } from 'vite';
// Importo el plugin oficial de React que habilita JSX y Fast Refresh en desarrollo
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.VITE_URL_BACKEND": JSON.stringify(process.env.VITE_URL_BACKEND),
  },
  optimizeDeps: {
    // Pre-bundleo las dependencias más pesadas al arrancar para reducir el tiempo de carga en desarrollo
    include: ['react', 'react-dom', 'react-router-dom', 'dotenv'],
  },
  server: {
    host: '0.0.0.0',
    port: 443,
    strictPort: true
  },
  preview: {
    host: '0.0.0.0',
    port: 443,
    strictPort: true,
    cors: true,
  },
});
