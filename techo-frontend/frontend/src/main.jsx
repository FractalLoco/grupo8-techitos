// Importo React y ReactDOM para montar la aplicación en el DOM del navegador
import React from 'react';
import ReactDOM from 'react-dom/client';
// Importo el componente raíz que contiene todos los providers y rutas de la app
import Aplicacion from './App.jsx';
// Cargo los estilos globales que incluyen Tailwind y las animaciones personalizadas
import './index.css';

// Busco el elemento #root en el index.html y monto la app React dentro de él.
// Uso StrictMode para que React me muestre advertencias de buenas prácticas en desarrollo.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Aplicacion />
  </React.StrictMode>
);
