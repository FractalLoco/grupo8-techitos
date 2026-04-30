const conexion = require('../config/baseDatos');

// crear tablas si no existen (muy básico y idempotente)
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

    CREATE TABLE IF NOT EXISTS mensajes (
      id SERIAL PRIMARY KEY,
      cuadrilla_id INTEGER REFERENCES cuadrillas(id) ON DELETE SET NULL,
      remitente_id INTEGER NOT NULL,
      tipo VARCHAR(50) DEFAULT 'texto',
      contenido TEXT,
      archivo_url TEXT,
      prioridad BOOLEAN DEFAULT false,
      creado_en TIMESTAMP DEFAULT NOW()
    );
  `);
};

// asegurar inicialización en primer uso
inicializar().catch((e) => console.error('error iniciando tablas chatModel:', e.message));

const enviarMensaje = async ({ cuadrilla_id = null, remitente_id, tipo = 'texto', contenido = null, archivo_url = null, prioridad = false }) => {
  const resultado = await conexion.query(
    `INSERT INTO mensajes (cuadrilla_id, remitente_id, tipo, contenido, archivo_url, prioridad) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [cuadrilla_id, remitente_id, tipo, contenido, archivo_url, prioridad]
  );
  return resultado.rows[0];
};

const listarMensajesPorCuadrilla = async (cuadrilla_id, limite = 200) => {
  const resultado = await conexion.query(
    `SELECT m.*, u.nombre as remitente_nombre FROM mensajes m LEFT JOIN usuarios u ON u.id = m.remitente_id WHERE m.cuadrilla_id = $1 ORDER BY m.creado_en DESC LIMIT $2`,
    [cuadrilla_id, limite]
  );
  return resultado.rows;
};

const listarMensajesBroadcast = async (limite = 200) => {
  const resultado = await conexion.query(
    `SELECT m.*, u.nombre as remitente_nombre FROM mensajes m LEFT JOIN usuarios u ON u.id = m.remitente_id WHERE m.cuadrilla_id IS NULL ORDER BY m.creado_en DESC LIMIT $1`,
    [limite]
  );
  return resultado.rows;
};

const usuarioPerteneceACuadrilla = async (usuario_id) => {
  const resultado = await conexion.query(
    'SELECT cm.* FROM cuadrilla_miembros cm WHERE cm.usuario_id = $1 LIMIT 1',
    [usuario_id]
  );
  return resultado.rows[0] || null;
};

const usuarioEnCuadrilla = async (usuario_id, cuadrilla_id) => {
  const resultado = await conexion.query(
    'SELECT 1 FROM cuadrilla_miembros WHERE usuario_id = $1 AND cuadrilla_id = $2 LIMIT 1',
    [usuario_id, cuadrilla_id]
  );
  return resultado.rowCount > 0;
};

module.exports = {
  enviarMensaje,
  listarMensajesPorCuadrilla,
  listarMensajesBroadcast,
  usuarioPerteneceACuadrilla,
  usuarioEnCuadrilla,
};
