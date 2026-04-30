'use strict';
// Importo express como base del servidor HTTP y cors para permitir peticiones del frontend
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Traigo la función que inicializa la conexión con PostgreSQL antes de arrancar
import { initDatabase } from './config/database.js';
// Importo el enrutador principal que agrupa todas las rutas de la API
import routes from './routes/index.js';

// Cargo las variables de entorno desde el archivo .env
dotenv.config();

const app = express();

// Habilito CORS para que el frontend pueda comunicarse con este servidor sin bloqueos
app.use(cors());
// Permito recibir cuerpos de solicitud en formato JSON
app.use(express.json());

// Registro todas las rutas bajo el prefijo /api
app.use('/api', routes);

// Manejo las rutas que no existen devolviendo un 404 claro con la URL que se intentó acceder
app.use((solicitud, respuesta) => {
  respuesta.status(404).json({
    estado: 'error',
    codigo: 404,
    mensaje: 'Ruta no encontrada en el servidor',
    ruta: solicitud.originalUrl,
  });
});

// Capturo cualquier error no controlado que se produzca durante el procesamiento de una solicitud
app.use((error, solicitud, respuesta, siguiente) => {
  console.error('Error interno:', error.message);
  respuesta.status(500).json({
    estado: 'error',
    codigo: 500,
    mensaje: 'Error interno del servidor',
  });
});

const PUERTO = process.env.PUERTO || 3000;

// Primero conecto la base de datos y solo si eso funciona levanto el servidor HTTP
initDatabase()
  .then(() => {
    app.listen(PUERTO, () => {
      console.log(`Servidor corriendo en puerto ${PUERTO}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  });
