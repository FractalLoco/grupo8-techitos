'use strict';
import { ObraService } from '../services/obra.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// Se registra una obra nueva con su nombre, descripción y coordenadas exactas
export const crearObra = async (solicitud, respuesta) => {
  try {
    const obra = await ObraService.crearObra(solicitud.body);
    return respuestaExito(respuesta, 201, 'Obra registrada correctamente', { obra });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Se listan todas las obras de una emergencia para mostrarlas como puntos en el mapa
export const listarObrasPorEmergencia = async (solicitud, respuesta) => {
  try {
    const { emergenciaId } = solicitud.params;
    const obras = await ObraService.listarPorEmergencia(parseInt(emergenciaId));
    return respuestaExito(respuesta, 200, 'Obras obtenidas', { obras });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Se devuelve el detalle de una obra, incluyendo sus coordenadas para el mapa
export const obtenerObra = async (solicitud, respuesta) => {
  try {
    const { id } = solicitud.params;
    const obra = await ObraService.obtenerDetalle(parseInt(id));
    return respuestaExito(respuesta, 200, 'Obra obtenida', { obra });
  } catch (error) {
    return respuestaError(respuesta, 404, error.message);
  }
};

// Se cambia el estado de la obra cuando avanza o se cierra
export const actualizarEstadoObra = async (solicitud, respuesta) => {
  try {
    const { id } = solicitud.params;
    const { estado } = solicitud.body;
    const obra = await ObraService.actualizarEstado(parseInt(id), estado);
    return respuestaExito(respuesta, 200, 'Estado de obra actualizado', { obra });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};
