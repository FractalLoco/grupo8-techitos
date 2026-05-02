const conexion = require("../config/baseDatos");

// acá van todas las consultas SQL relacionadas al usuario
// el service llama estas funciones con la lógica de negocio
// nunca escribe SQL directamente en controllers o routes

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

// crear un nuevo usuario en la base de datos (recibe hash ya encriptado del service)
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

  return resultado.rows[0];
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

// actualizar datos de un usuario (puede incluir nombre, correo, rol y/o contraseña)
const actualizarUsuario = async (id, datos) => {
  const { nombre, correo, rol, contrasena } = datos;
  
  // construir la consulta dinámicamente según qué campos se quieran actualizar
  const campos = [];
  const valores = [];
  let contador = 1;

  if (nombre !== undefined) {
    campos.push(`nombre = $${contador++}`);
    valores.push(nombre);
  }
  if (correo !== undefined) {
    campos.push(`correo = $${contador++}`);
    valores.push(correo);
  }
  if (rol !== undefined) {
    campos.push(`rol = $${contador++}`);
    valores.push(rol);
  }
  if (contrasena !== undefined) {
    campos.push(`contrasena = $${contador++}`);
    valores.push(contrasena);
  }

  if (campos.length === 0) {
    return null; // nada que actualizar
  }

  valores.push(id); // el id va al final en el WHERE

  const consulta = `UPDATE usuarios SET ${campos.join(", ")} WHERE id = $${contador} RETURNING id, nombre, rut, correo, rol, activo`;
  
  const resultado = await conexion.query(consulta, valores);
  return resultado.rows[0] || null;
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
  return resultado.rows[0] || null;
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

  return resultado.rows[0] || null;
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
  registrarAuditoria,
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
