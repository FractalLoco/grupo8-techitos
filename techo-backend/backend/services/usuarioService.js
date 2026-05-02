const usuarioModel = require('../models/usuarioModel');
const { encriptarContrasena } = require('./seguridad');

// registrar una acción en auditoría
const registrarAuditoria = async (usuarioId, accion) => {
  await usuarioModel.registrarAuditoria(usuarioId, accion);
};

// crear un nuevo usuario (se asume que viene con la contraseña sin encriptar)
const crearUsuario = async (nombre, rut, correo, contrasena, rol = 'voluntario') => {
  const contrasenaHash = await encriptarContrasena(contrasena);
  const usuario = await usuarioModel.crearUsuario(
    nombre,
    rut,
    correo,
    contrasenaHash,
    rol
  );
  return usuario;
};

// actualizar datos de un usuario (puede incluir cambio de contraseña)
const actualizarUsuario = async (id, datos) => {
  const { nombre, correo, rol, contrasena } = datos;
  
  // si viene contraseña nueva, la encriptamos
  let contrasenaHash = undefined;
  if (contrasena) {
    contrasenaHash = await encriptarContrasena(contrasena);
  }

  const datosActualizar = {
    nombre,
    correo,
    rol,
    ...(contrasenaHash && { contrasena: contrasenaHash }),
  };

  const usuario = await usuarioModel.actualizarUsuario(id, datosActualizar);

  if (usuario) {
    await registrarAuditoria(id, 'EDITAR');
  }

  return usuario;
};

// activar o desactivar un usuario
const cambiarEstadoActivo = async (id, activo) => {
  const usuario = await usuarioModel.cambiarEstadoActivo(id, activo);

  if (usuario) {
    await registrarAuditoria(id, activo ? 'ACTIVAR' : 'DESACTIVAR');
  }

  return usuario;
};

// eliminar un usuario
const eliminarUsuario = async (id) => {
  const usuario = await usuarioModel.eliminarUsuario(id);

  if (usuario) {
    await registrarAuditoria(id, 'ELIMINAR');
  }

  return usuario;
};

// desactivar usuario cuando termina su voluntariado
const desactivarUsuario = async (id) => {
  const usuario = await usuarioModel.desactivarUsuario(id);

  if (usuario) {
    await registrarAuditoria(id, 'DESACTIVAR');
  }

  return usuario;
};

module.exports = {
  registrarAuditoria,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoActivo,
  eliminarUsuario,
  desactivarUsuario,
};
