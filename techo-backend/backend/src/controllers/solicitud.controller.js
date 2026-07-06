'use strict';
import { SolicitudService } from '../services/solicitud.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

export const crearSolicitud = async (req, res) => {
  try {
    const { cuadrillaId, emergenciaId, tipo, descripcion, nombre_item, cantidad } = req.body;
    const jefeId = req.usuario.id;
    const solicitud = await SolicitudService.crear(jefeId, cuadrillaId, emergenciaId, tipo, descripcion, nombre_item, cantidad);
    return respuestaExito(res, 201, 'Solicitud enviada correctamente', { solicitud });
  } catch (error) {
    return respuestaError(res, 400, error.message);
  }
};

export const listarTodas = async (req, res) => {
  try {
    const solicitudes = await SolicitudService.listarTodas();
    return respuestaExito(res, 200, 'Solicitudes obtenidas', { solicitudes });
  } catch (error) {
    return respuestaError(res, 500, error.message);
  }
};

export const listarPorEmergencia = async (req, res) => {
  try {
    const { emergenciaId } = req.params;
    const solicitudes = await SolicitudService.listarPorEmergencia(parseInt(emergenciaId));
    return respuestaExito(res, 200, 'Solicitudes obtenidas', { solicitudes });
  } catch (error) {
    return respuestaError(res, 500, error.message);
  }
};

export const listarMias = async (req, res) => {
  try {
    const jefeId = req.usuario.id;
    const solicitudes = await SolicitudService.listarPorJefe(jefeId);
    return respuestaExito(res, 200, 'Solicitudes obtenidas', { solicitudes });
  } catch (error) {
    return respuestaError(res, 500, error.message);
  }
};

export const listarPorCuadrilla = async (req, res) => {
  try {
    const { cuadrillaId } = req.params;
    const solicitudes = await SolicitudService.listarPorCuadrilla(parseInt(cuadrillaId));
    return respuestaExito(res, 200, 'Solicitudes obtenidas', { solicitudes });
  } catch (error) {
    return respuestaError(res, 500, error.message);
  }
};

export const actualizarEstadoSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, respuesta } = req.body;
    const coordinadorId = req.usuario?.id || null;
    const solicitud = await SolicitudService.actualizarEstado(parseInt(id), estado, respuesta, coordinadorId);
    return respuestaExito(res, 200, 'Solicitud actualizada', { solicitud });
  } catch (error) {
    return respuestaError(res, 400, error.message);
  }
};
