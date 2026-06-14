'use strict';
import { ZonaPeligroService } from '../services/zona-peligro.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// Creo una zona de peligro en el mapa; el coordinador hace clic en un punto y define tipo y comentario
export const crearZona = async (solicitud, respuesta) => {
  try {
    const zona = await ZonaPeligroService.crearZona({
      ...solicitud.body,
      // El ID del coordinador queda registrado en creado_por
      creado_por: solicitud.usuario.id,
    });
    return respuestaExito(respuesta, 201, 'Zona de peligro registrada en el mapa', { zona });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Devuelvo todas las zonas de peligro de una emergencia para pintarlas como circulos en el mapa
export const listarZonas = async (solicitud, respuesta) => {
  try {
    const { emergenciaId } = solicitud.params;
    const zonas = await ZonaPeligroService.listarPorEmergencia(Number(emergenciaId));
    return respuestaExito(respuesta, 200, 'Zonas de peligro obtenidas', { zonas });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Elimino una zona del mapa cuando el coordinador decide que ya no es relevante
export const eliminarZona = async (solicitud, respuesta) => {
  try {
    const { zonaId } = solicitud.params;
    await ZonaPeligroService.eliminarZona(Number(zonaId));
    return respuestaExito(respuesta, 200, 'Zona de peligro eliminada del mapa');
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};
