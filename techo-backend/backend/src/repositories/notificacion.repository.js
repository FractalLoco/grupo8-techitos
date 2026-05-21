'use strict';
import AppDataSource from '../config/database.js';

export class NotificacionRepository {
  static getRepository() {
    return AppDataSource.getRepository('Notificacion');
  }

  // Se guarda la notificación nueva para el usuario que corresponda
  static async crear(datos) {
    const repo = this.getRepository();
    const notificacion = repo.create(datos);
    return repo.save(notificacion);
  }

  // Se traen todas las notificaciones del usuario, ordenadas de la más nueva a la más vieja
  static async listarPorUsuario(usuarioId) {
    return this.getRepository().find({
      where: { usuario_id: usuarioId },
      order: { creado_en: 'DESC' },
    });
  }

  // Se cuentan solo las no leídas, ese número va en el badge de la campana
  static async contarNoLeidas(usuarioId) {
    return this.getRepository().count({
      where: { usuario_id: usuarioId, leida: false },
    });
  }

  // Se marca como leída filtrando por id y usuario para que nadie toque las ajenas
  static async marcarLeida(id, usuarioId) {
    const repo = this.getRepository();
    await repo.update({ id, usuario_id: usuarioId }, { leida: true });
    return repo.findOne({ where: { id } });
  }

  // Se marcan todas como leídas de golpe cuando el usuario limpia la bandeja
  static async marcarTodasLeidas(usuarioId) {
    return this.getRepository().update({ usuario_id: usuarioId, leida: false }, { leida: true });
  }
}
