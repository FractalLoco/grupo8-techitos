'use strict';
import { EmergenciaService } from '../services/emergencia.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

export const crearEmergencia = async (solicitud, respuesta) => {
  try {
    const emergencia = await EmergenciaService.crearEmergencia(solicitud.body, solicitud.usuario);
    return respuestaExito(respuesta, 201, 'Emergencia creada correctamente', { emergencia });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

export const listarActivas = async (_solicitud, respuesta) => {
  try {
    const emergencias = await EmergenciaService.listarActivas();
    return respuestaExito(respuesta, 200, 'Emergencias activas', { emergencias });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

export const listarTodas = async (_solicitud, respuesta) => {
  try {
    const emergencias = await EmergenciaService.listarTodas();
    return respuestaExito(respuesta, 200, 'Todas las emergencias', { emergencias });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

export const obtenerDetalle = async (solicitud, respuesta) => {
  try {
    const emergencia = await EmergenciaService.obtenerDetalle(solicitud.params.id);
    return respuestaExito(respuesta, 200, 'Detalle de emergencia', { emergencia });
  } catch (error) {
    return respuestaError(respuesta, 404, error.message);
  }
};

export const actualizarEmergencia = async (solicitud, respuesta) => {
  try {
    const emergencia = await EmergenciaService.actualizarEmergencia(
      solicitud.params.id,
      solicitud.body,
      solicitud.usuario
    );

    return respuestaExito(
      respuesta,
      200,
      'Emergencia actualizada correctamente',
      { emergencia }
    );
  } catch (error) {
    const codigo = error.message.includes('no encontrada') ? 404 : 400;
    return respuestaError(respuesta, codigo, error.message);
  }
};

export const finalizarEmergencia = async (solicitud, respuesta) => {
  try {
    const emergencia = await EmergenciaService.finalizarEmergencia(
      solicitud.params.id,
      solicitud.usuario
    );
    return respuestaExito(respuesta, 200, 'Emergencia finalizada', { emergencia });
  } catch (error) {
    const codigo = error.message.includes('no encontrada') ? 404 : 400;
    return respuestaError(respuesta, codigo, error.message);
  }
};

export const registrarFamilia = async (solicitud, respuesta) => {
  try {
    const datos = {
      ...solicitud.body,
      emergencia_id: parseInt(solicitud.params.emergenciaId, 10),
    };
    const familia = await EmergenciaService.registrarFamilia(datos, solicitud.usuario);
    return respuestaExito(respuesta, 201, 'Familia registrada correctamente', { familia });
  } catch (error) {
    const codigo = error.message.includes('no encontrada') ? 404 : 400;
    return respuestaError(respuesta, codigo, error.message);
  }
};

export const listarFamilias = async (solicitud, respuesta) => {
  try {
    const familias = await EmergenciaService.listarFamilias(solicitud.params.emergenciaId);
    return respuestaExito(respuesta, 200, 'Familias obtenidas', { familias });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

export const registrarEvaluacion = async (solicitud, respuesta) => {
  try {
    const datos = {
      ...solicitud.body,
      emergencia_id: parseInt(solicitud.params.emergenciaId, 10),
      familia_id: parseInt(solicitud.params.familiaId, 10),
    };
    const evaluacion = await EmergenciaService.registrarEvaluacion(datos, solicitud.usuario);
    return respuestaExito(respuesta, 201, 'Evaluación registrada correctamente', { evaluacion });
  } catch (error) {
    const codigo = error.message.includes('no encontrada') ? 404 : 400;
    return respuestaError(respuesta, codigo, error.message);
  }
};

export const listarEvaluaciones = async (solicitud, respuesta) => {
  try {
    const evaluaciones = await EmergenciaService.listarEvaluaciones(solicitud.params.emergenciaId);
    return respuestaExito(respuesta, 200, 'Evaluaciones obtenidas', { evaluaciones });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};
