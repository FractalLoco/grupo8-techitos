'use strict';
import { UsuarioService } from '../services/usuario.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

export const listarUsuarios = async (_req, res) => {
  try {
    const usuarios = await UsuarioService.listarUsuarios();
    return respuestaExito(res, 200, 'Usuarios obtenidos correctamente', { usuarios });
  } catch (error) {
    return respuestaError(res, 500, error.message);
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const usuario = await UsuarioService.crearUsuario(req.body);
    return respuestaExito(res, 201, 'Usuario creado correctamente', { usuario });
  } catch (error) {
    const codigo = error.message.includes('existe') ? 409 : 400;
    return respuestaError(res, codigo, error.message);
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const usuario = await UsuarioService.actualizarUsuario(req.params.id, req.body);
    return respuestaExito(res, 200, 'Usuario actualizado correctamente', { usuario });
  } catch (error) {
    const codigo = error.message.includes('no encontrado') ? 404 : 400;
    return respuestaError(res, codigo, error.message);
  }
};

export const desactivarUsuario = async (req, res) => {
  try {
    const usuario = await UsuarioService.cambiarEstado(req.params.id, false);
    return respuestaExito(res, 200, 'Usuario desactivado correctamente', { usuario });
  } catch (error) {
    return respuestaError(res, 404, error.message);
  }
};

export const activarUsuario = async (req, res) => {
  try {
    const usuario = await UsuarioService.cambiarEstado(req.params.id, true);
    return respuestaExito(res, 200, 'Usuario activado correctamente', { usuario });
  } catch (error) {
    return respuestaError(res, 404, error.message);
  }
};
