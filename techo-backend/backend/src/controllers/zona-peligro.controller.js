'use strict';
import { ZonaPeligroService } from '../services/zona-peligro.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// El coordinador dibuja una zona nueva en el mapa indicando tipo, coordenadas, radio y descripción.
export const crearZona = async (solicitud, respuesta) => {
  try {
    const zona = await ZonaPeligroService.crearZona(solicitud.body, solicitud.usuario.id);
    return respuestaExito(respuesta, 201, 'Zona de peligro creada', { zona });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Traigo todas las zonas de una emergencia para que el mapa las pinte como círculos.
export const listarZonasPorEmergencia = async (solicitud, respuesta) => {
  try {
    const { emergenciaId } = solicitud.params;
    const zonas = await ZonaPeligroService.listarPorEmergencia(emergenciaId);
    return respuestaExito(respuesta, 200, 'Zonas de peligro obtenidas', { zonas });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// El coordinador puede editar el radio, tipo, descripción o comentarios de una zona existente.
export const actualizarZona = async (solicitud, respuesta) => {
  try {
    const { zonaId } = solicitud.params;
    const zona = await ZonaPeligroService.actualizarZona(zonaId, solicitud.body);
    return respuestaExito(respuesta, 200, 'Zona de peligro actualizada', { zona });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Elimino la zona del mapa cuando el coordinador decide que ya no aplica.
export const eliminarZona = async (solicitud, respuesta) => {
  try {
    const { zonaId } = solicitud.params;
    await ZonaPeligroService.eliminarZona(zonaId);
    return respuestaExito(respuesta, 200, 'Zona de peligro eliminada');
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};
