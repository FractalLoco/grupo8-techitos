'use strict';
import { NotificacionService } from '../services/notificacion.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// Se traen todas las notificaciones del usuario que tiene la sesión activa
export const listarNotificaciones = async (solicitud, respuesta) => {
  try {
    const notificaciones = await NotificacionService.listarPorUsuario(solicitud.usuario.id);
    return respuestaExito(respuesta, 200, 'Notificaciones obtenidas', { notificaciones });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Se cuenta cuántas no han sido leídas; ese número se muestra en la campana
export const contarNoLeidas = async (solicitud, respuesta) => {
  try {
    const total = await NotificacionService.contarNoLeidas(solicitud.usuario.id);
    return respuestaExito(respuesta, 200, 'Conteo de no leídas', { total });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Se marca una notificación como leída cuando el usuario la abre
export const marcarLeida = async (solicitud, respuesta) => {
  try {
    const { id } = solicitud.params;
    const notificacion = await NotificacionService.marcarLeida(parseInt(id), solicitud.usuario.id);
    return respuestaExito(respuesta, 200, 'Notificación marcada como leída', { notificacion });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Se limpian todas las notificaciones de una sola vez
export const marcarTodasLeidas = async (solicitud, respuesta) => {
  try {
    await NotificacionService.marcarTodasLeidas(solicitud.usuario.id);
    return respuestaExito(respuesta, 200, 'Todas las notificaciones marcadas como leídas');
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};
