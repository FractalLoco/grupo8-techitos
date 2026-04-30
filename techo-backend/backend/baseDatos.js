const { Pool } = require('pg');

// acá le decimos a postgres con qué base de datos trabajar
// si algo falla acá, revisar que el nombre y la contraseña estén bien escritos
const conexion = new Pool({
  user: process.env.USUARIO_DB || 'tu_usuario',
  host: process.env.HOST_DB || 'localhost',
  database: process.env.DATABASE || 'techo_db',
  password: process.env.PASSWORD_DB || 'tu_contrasena',
  port: process.env.PORT_DB || 5432,
});

// esto solo sirve para saber si la base de datos respondió bien al arrancar
// si sale error acá es porque postgres no está corriendo o los datos están mal
conexion.connect((error, cliente, liberar) => {
  if (error) {
    console.error('no se pudo conectar a la base de datos:', error.message);
    process.exit(1);
  } else {
    console.log('base de datos conectada correctamente');
    liberar();
  }
});

// manejar errores no esperados de la conexión
conexion.on('error', (error) => {
  console.error('error inesperado en la conexión:', error.message);
});

module.exports = conexion;
