/** @type {import('tailwindcss').Config} */
module.exports = {
  // Indico a Tailwind qué archivos escanear para purgar clases no usadas en producción
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Paleta Material 3 (generada con Stitch) — tokens accesibles que uso en mis páginas
        // (Mapa, Cuadrillas, Inventario, Solicitudes). Los roles "on-*" garantizan contraste WCAG
        // sobre su contenedor correspondiente.
        'primary': '#006195',
        'primary-dark': '#004b74',          // hover/presionado de botones primarios
        'primary-container': '#007aba',
        'on-primary': '#ffffff',
        'on-primary-container': '#fdfcff',
        'primary-fixed': '#cde5ff',
        'primary-fixed-dim': '#94ccff',
        'secondary': '#006d37',             // verde — éxito / en tiempo
        'secondary-container': '#6bfe9c',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#00743a',
        'secondary-fixed': '#6bfe9c',
        'secondary-fixed-dim': '#4ae183',
        'tertiary': '#835100',              // ámbar — advertencias / riesgo
        'tertiary-container': '#a46700',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fffbff',
        'tertiary-fixed': '#ffddb9',
        'tertiary-fixed-dim': '#ffb961',
        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'background': '#f7f9ff',
        'on-background': '#181c21',
        'surface': '#f7f9ff',
        'on-surface': '#181c21',
        'surface-variant': '#dfe3e9',
        'on-surface-variant': '#3f4851',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f0f4fa',
        'surface-container': '#eaeef5',
        'surface-container-high': '#e5e8ef',
        'surface-container-highest': '#dfe3e9',
        'surface-dim': '#d7dae1',
        'surface-bright': '#f7f9ff',
        'outline': '#6f7882',               // texto secundario/íconos — cumple contraste AA
        'outline-variant': '#bfc7d2',       // bordes y divisores
        'inverse-surface': '#2c3136',       // fondo oscuro del panel lateral
        'inverse-on-surface': '#edf1f7',
        'inverse-primary': '#94ccff',
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
      boxShadow: {
        'card':       '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 6px 20px -4px rgba(0,0,0,0.11), 0 2px 8px -2px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
