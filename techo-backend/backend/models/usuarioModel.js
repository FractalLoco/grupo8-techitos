const conexion = require("../config/baseDatos");

// acá van todas las consultas SQL relacionadas al usuario
// el controller llama estas funciones, nunca escribe SQL directamente

const registrarAuditoria = async (usuarioId, accion) => {
  await conexion.query(
    "INSERT INTO auditoria_usuarios (usuario_id, accion) VALUES ($1, $2)",
    [usuarioId, accion],
  );
};

const buscarPorRut = async (rut) => {
  const resultado = await conexion.query(
    "SELECT * FROM usuarios WHERE rut = $1",
    [rut],
  );
  // devolvemos solo la primera fila o null si no existe
  return resultado.rows[0] || null;
};

const buscarPorId = async (id) => {
  const resultado = await conexion.query(
    "SELECT id, nombre, rut, correo, rol, activo FROM usuarios WHERE id = $1",
    [id],
  );
  return resultado.rows[0] || null;
};

// crear un nuevo usuario en la base de datos
const crearUsuario = async (
  nombre,
  rut,
  correo,
  contrasenaHash,
  rol = "voluntario",
) => {
  const resultado = await conexion.query(
    "INSERT INTO usuarios (nombre, rut, correo, contrasena, rol, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, rut, correo, rol, activo",
    [nombre, rut, correo, contrasenaHash, rol, false],
  );

  const usuario = resultado.rows[0];

  await registrarAuditoria(usuario.id, "CREAR");

  return usuario;
};

// obtener todos los usuarios (con paginación opcional)
const listarUsuarios = async (limite = 50, pagina = 1) => {
  const desplazamiento = (pagina - 1) * limite;
  const resultado = await conexion.query(
    "SELECT id, nombre, rut, correo, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC LIMIT $1 OFFSET $2",
    [limite, desplazamiento],
  );
  return resultado.rows;
};

// contar total de usuarios (útil para paginación)
const contarUsuarios = async () => {
  const resultado = await conexion.query("SELECT COUNT(*) FROM usuarios");
  return parseInt(resultado.rows[0].count, 10);
};

// actualizar datos de un usuario
const actualizarUsuario = async (id, datos) => {
  const { nombre, correo, rol } = datos;
  const resultado = await conexion.query(
    "UPDATE usuarios SET nombre = $1, correo = $2, rol = $3 WHERE id = $4 RETURNING id, nombre, rut, correo, rol, activo",
    [nombre, correo, rol, id],
  );
  const usuario = resultado.rows[0];

  if (usuario) {
    await registrarAuditoria(id, "EDITAR");
  }

  return usuario;
};

// cambiar la contraseña de un usuario
const cambiarContrasena = async (id, nuevoHash) => {
  const resultado = await conexion.query(
    "UPDATE usuarios SET contrasena = $1 WHERE id = $2 RETURNING id, nombre, rut, correo",
    [nuevoHash, id],
  );
  return resultado.rows[0] || null;
};

// activar o desactivar un usuario
const cambiarEstadoActivo = async (id, activo) => {
  const resultado = await conexion.query(
    "UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, rut, correo, rol, activo",
    [activo, id],
  );
  const usuario = resultado.rows[0];

  if (usuario) {
    await registrarAuditoria(id, activo ? "ACTIVAR" : "DESACTIVAR");
  }

  return usuario;
};

// eliminar un usuario (soft delete recomendado, pero acá es hard delete)
const eliminarUsuario = async (id) => {
  const resultado = await conexion.query(
    "DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre, rut",
    [id],
  );
  return resultado.rows[0] || null;
};

// desactivar al usuario cuando termine su voluntariado para efectos de trazabilidad
const desactivarUsuario = async (id) => {
  const resultado = await conexion.query(
    "UPDATE usuarios SET activo = false, desactivado_en = NOW() WHERE id = $1 RETURNING id, nombre, rut, activo",
    [id],
  );

  const usuario = resultado.rows[0];

  if (usuario) {
    await registrarAuditoria(id, "DESACTIVAR");
  }

  return usuario;
};

// buscar usuarios por rol
const buscarPorRol = async (rol) => {
  const resultado = await conexion.query(
    "SELECT id, nombre, rut, correo, rol, activo FROM usuarios WHERE rol = $1 ORDER BY nombre",
    [rol],
  );
  return resultado.rows;
};

module.exports = {
  buscarPorRut,
  buscarPorId,
  crearUsuario,
  listarUsuarios,
  contarUsuarios,
  actualizarUsuario,
  cambiarContrasena,
  cambiarEstadoActivo,
  eliminarUsuario,
  desactivarUsuario,
  buscarPorRol,
};
