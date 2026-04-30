const { Pool } = require('pg');
require('dotenv').config();

// acá le decimos a postgres con qué base de datos trabajar
// todos los valores sensibles vienen del archivo .env
const conexion = new Pool({
  user:     process.env.DB_USUARIO,
  host:     process.env.DB_HOST,
  database: process.env.DB_NOMBRE,
  password: process.env.DB_CONTRASENA,
  port:     process.env.DB_PUERTO,
});

// esto solo sirve para saber si postgres respondió bien al arrancar
conexion.connect((error, cliente, liberar) => {
  if (error) {
    console.error('no se pudo conectar a la base de datos:', error.message);
  } else {
    console.log('base de datos conectada correctamente');
    liberar();
  }
});

module.exports = conexion;
