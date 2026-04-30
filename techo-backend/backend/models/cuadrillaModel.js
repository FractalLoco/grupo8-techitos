const conexion = require('../config/baseDatos');

const inicializar = async () => {
  await conexion.query(`
    CREATE TABLE IF NOT EXISTS cuadrillas (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      activo BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS cuadrilla_miembros (
      id SERIAL PRIMARY KEY,
      cuadrilla_id INTEGER REFERENCES cuadrillas(id) ON DELETE CASCADE,
      usuario_id INTEGER,
      es_jefe BOOLEAN DEFAULT false
    );
  `);
};

inicializar().catch((e) => console.error('error iniciando tablas cuadrillaModel:', e.message));

const obtenerCuadrillaPorId = async (id) => {
  const resultado = await conexion.query('SELECT * FROM cuadrillas WHERE id = $1', [id]);
  return resultado.rows[0] || null;
};

const listarCuadrillas = async () => {
  const resultado = await conexion.query('SELECT * FROM cuadrillas ORDER BY id');
  return resultado.rows;
};

const agregarMiembro = async (cuadrilla_id, usuario_id, es_jefe = false) => {
  const resultado = await conexion.query('INSERT INTO cuadrilla_miembros (cuadrilla_id, usuario_id, es_jefe) VALUES ($1,$2,$3) RETURNING *', [cuadrilla_id, usuario_id, es_jefe]);
  return resultado.rows[0];
};

module.exports = { obtenerCuadrillaPorId, listarCuadrillas, agregarMiembro };
