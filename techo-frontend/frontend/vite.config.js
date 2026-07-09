// Importo defineConfig para que Vite tenga autocompletado y validación de opciones
import { defineConfig } from 'vite';
// Importo el plugin oficial de React que habilita JSX y Fast Refresh en desarrollo
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundleo las dependencias más pesadas al arrancar para reducir el tiempo de carga en desarrollo
    include: ['react', 'react-dom', 'react-router-dom'],
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
