'use strict';
import { EmergenciaService } from '../services/emergencia.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// Creo una nueva emergencia con los datos enviados por el coordinador (nombre, descripción, coordenadas).
export const crearEmergencia = async (solicitud, respuesta) => {
  try {
    const emergencia = await EmergenciaService.crearEmergencia(solicitud.body);
    return respuestaExito(respuesta, 201, 'Emergencia creada correctamente', { emergencia });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Devuelvo solo las emergencias en estado 'activa' para que el frontend muestre las vigentes.
export const listarActivas = async (solicitud, respuesta) => {
  try {
    const emergencias = await EmergenciaService.listarActivas();
    return respuestaExito(respuesta, 200, 'Emergencias activas', { emergencias });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Devuelvo todas las emergencias sin importar su estado, útil para el historial del coordinador.
export const listarTodas = async (solicitud, respuesta) => {
  try {
    const emergencias = await EmergenciaService.listarTodas();
    return respuestaExito(respuesta, 200, 'Todas las emergencias', { emergencias });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Obtengo el detalle completo de una emergencia por su ID; devuelvo 404 si no existe.
export const obtenerDetalle = async (solicitud, respuesta) => {
  try {
    const emergencia = await EmergenciaService.obtenerDetalle(solicitud.params.id);
    return respuestaExito(respuesta, 200, 'Detalle de emergencia', { emergencia });
  } catch (error) {
    return respuestaError(respuesta, 404, error.message);
  }
};

// Finalizo la emergencia registrando la fecha de cierre y cambiando su estado a 'finalizada'.
export const finalizarEmergencia = async (solicitud, respuesta) => {
  try {
    const emergencia = await EmergenciaService.finalizarEmergencia(solicitud.params.id);
    return respuestaExito(respuesta, 200, 'Emergencia finalizada', { emergencia });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Registro una familia afectada vinculándola a su emergencia con ubicación y nivel de prioridad.
// Inyecto el emergencia_id desde el parámetro de la URL porque la DB lo requiere como NOT NULL.
export const registrarFamilia = async (solicitud, respuesta) => {
  try {
    const datos = {
      ...solicitud.body,
      emergencia_id: parseInt(solicitud.params.emergenciaId),
    };
    const familia = await EmergenciaService.registrarFamilia(datos);
    return respuestaExito(respuesta, 201, 'Familia registrada correctamente', { familia });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Listo todas las familias registradas bajo una emergencia específica.
export const listarFamilias = async (solicitud, respuesta) => {
  try {
    const familias = await EmergenciaService.listarFamilias(solicitud.params.emergenciaId);
    return respuestaExito(respuesta, 200, 'Familias obtenidas', { familias });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Registro una evaluación de diagnóstico para una familia afectada dentro de una emergencia.
// Inyecto ambos IDs desde la URL para garantizar consistencia con la estructura de rutas.
export const registrarEvaluacion = async (solicitud, respuesta) => {
  try {
    const datos = {
      ...solicitud.body,
      emergencia_id: parseInt(solicitud.params.emergenciaId),
      familia_id: parseInt(solicitud.params.familiaId),
    };
    const evaluacion = await EmergenciaService.registrarEvaluacion(datos);
    return respuestaExito(respuesta, 201, 'Evaluación registrada correctamente', { evaluacion });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Listo todas las evaluaciones realizadas en el marco de una emergencia.
export const listarEvaluaciones = async (solicitud, respuesta) => {
  try {
    const evaluaciones = await EmergenciaService.listarEvaluaciones(solicitud.params.emergenciaId);
    return respuestaExito(respuesta, 200, 'Evaluaciones obtenidas', { evaluaciones });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};
