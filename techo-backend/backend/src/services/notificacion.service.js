'use strict';
import { NotificacionRepository } from '../repositories/notificacion.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';

export class NotificacionService {
  // Se avisa a un usuario puntual con el título y mensaje que se le pase
  static async crearNotificacion(usuarioId, titulo, mensaje, tipo, referenciaId = null) {
    return NotificacionRepository.crear({
      usuario_id: Number(usuarioId),
      titulo,
      mensaje,
      tipo,
      referencia_id: referenciaId,
    });
  }

  // Se avisa a todos los integrantes de la cuadrilla al mismo tiempo
  static async notificarCuadrilla(cuadrillaId, titulo, mensaje, tipo, referenciaId = null) {
    const miembros = await MiembroCuadrillaRepository.listarPorCuadrilla(cuadrillaId);
    return Promise.all(
      miembros.map((m) =>
        NotificacionRepository.crear({
          usuario_id: m.voluntario_id,
          titulo,
          mensaje,
          tipo,
          referencia_id: referenciaId,
        })
      )
    );
  }

  // Se traen todas las notificaciones del usuario, las más recientes primero
  static async listarPorUsuario(usuarioId) {
    return NotificacionRepository.listarPorUsuario(usuarioId);
  }

  // Se cuentan las no leídas para mostrar el número en el ícono de campana
  static async contarNoLeidas(usuarioId) {
    return NotificacionRepository.contarNoLeidas(usuarioId);
  }

  // Se marca como leída, pero solo si le pertenece al usuario que la pide
  static async marcarLeida(id, usuarioId) {
    const notificacion = await NotificacionRepository.marcarLeida(id, usuarioId);
    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }
    return notificacion;
  }

  // Se limpian todas las notificaciones del usuario de una sola vez
  static async marcarTodasLeidas(usuarioId) {
    return NotificacionRepository.marcarTodasLeidas(usuarioId);
  }
}
