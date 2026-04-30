const express = require('express');
const cors = require('cors');
require('dotenv').config();

const inicioSesionRoutes = require('./routes/inicioSesionRoutes');
const comunicacionesRoutes = require('./routes/comunicacionesRoutes');

const aplicacion = express();

// cors va primero para que el frontend pueda hablarle al backend sin problemas
aplicacion.use(cors());
// esto permite que las peticiones lleguen en formato json
aplicacion.use(express.json());

// todas las rutas relacionadas al login van bajo /auth
aplicacion.use('/auth', inicioSesionRoutes);
// comunicaciones en general: chat y dashboard público
aplicacion.use('/api', comunicacionesRoutes);

// si alguien entra a una ruta que no existe respondemos con 404
aplicacion.use((solicitud, respuesta) => {
  respuesta.status(404).json({
    estado: 'error',
    codigo: 404,
    mensaje: 'Ruta no encontrada en el servidor',
    ruta: solicitud.originalUrl,
  });
});

// por si explota algo que no anticipamos, esto evita que el servidor se caiga
aplicacion.use((error, solicitud, respuesta, siguiente) => {
  console.error('algo salió mal:', error.message);
  respuesta.status(500).json({
    estado: 'error',
    codigo: 500,
    mensaje: 'Error interno del servidor',
  });
});

const PUERTO = process.env.PUERTO || 3000;
aplicacion.listen(PUERTO, () => {
  console.log(`servidor corriendo en el puerto ${PUERTO}`);
});
