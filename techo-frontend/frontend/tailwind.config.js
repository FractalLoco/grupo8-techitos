/** @type {import('tailwindcss').Config} */
module.exports = {
  // Indico a Tailwind qué archivos escanear para purgar clases no usadas en producción
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Paleta de colores propia de TECHO Chile; la uso con el prefijo "techo-" en los componentes
        techo: {
          primary: '#1a3a5c',      // Azul marino oscuro — color principal de la marca
          primaryDark: '#0f2440',  // Variante más oscura para degradados y hovers
          secondary: '#0099d6',    // Azul celeste — botones principales y acentos
          accent: '#f39c12',       // Naranja — alertas y elementos destacados
          success: '#27ae60',      // Verde — estados exitosos
          warning: '#f1c40f',      // Amarillo — advertencias
          danger: '#e74c3c',       // Rojo — errores y página 403
          light: '#f0f4f8',        // Gris claro — fondo general de las páginas internas
          dark: '#1a1a2e',         // Azul muy oscuro — fondo de degradados del login
        },
      },
      fontFamily: {
        // Uso Inter como tipografía principal con fallbacks de sistema
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
