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

  // Crea múltiples notificaciones en lote usando el queryRunner de una transacción
  static async crearMuchasConQueryRunner(lista, queryRunner) {
    const repo = queryRunner.manager.getRepository('Notificacion');
    const notificaciones = repo.create(lista);
    return repo.save(notificaciones);
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

  // Retorna los IDs de usuarios activos (rol coordinador, jefe_cuadrilla, voluntario)
  static async listarUsuariosActivos() {
    const repo = AppDataSource.getRepository('Usuario');
    const usuarios = await repo.find({
      where: { activo: true },
      select: ['id'],
    });
    return usuarios.map((u) => u.id);
  }

  // Retorna los IDs de coordinadores activos
  static async listarCoordinadoresActivos() {
    const repo = AppDataSource.getRepository('Usuario');
    const usuarios = await repo.find({
      where: { activo: true, rol: 'coordinador' },
      select: ['id'],
    });
    return usuarios.map((u) => u.id);
  }

  // Retorna los IDs de los integrantes de una cuadrilla + su jefe
  static async listarIntegrantesCuadrilla(cuadrillaId) {
    const repo = AppDataSource.getRepository('MiembroCuadrilla');
    const miembros = await repo.find({
      where: { cuadrilla_id: cuadrillaId },
      select: ['voluntario_id'],
    });
    const ids = miembros.map((m) => m.voluntario_id);

    // Agregar el jefe de la cuadrilla
    const cuadrillaRepo = AppDataSource.getRepository('Cuadrilla');
    const cuadrilla = await cuadrillaRepo.findOne({ where: { id: cuadrillaId }, select: ['jefe_id'] });
    if (cuadrilla && cuadrilla.jefe_id && !ids.includes(cuadrilla.jefe_id)) {
      ids.push(cuadrilla.jefe_id);
    }

    return ids;
  }

  static async listarVoluntariosCuadrilla(cuadrillaId) {
    const repo = AppDataSource.getRepository('MiembroCuadrilla');
    const miembros = await repo.find({
      where: { cuadrilla_id: cuadrillaId },
      select: ['voluntario_id'],
    });
    return [...new Set(miembros.map((miembro) => miembro.voluntario_id))];
  }

  static async obtenerJefeCuadrilla(cuadrillaId) {
    const repo = AppDataSource.getRepository('Cuadrilla');
    const cuadrilla = await repo.findOne({
      where: { id: cuadrillaId },
      select: ['jefe_id'],
    });
    return cuadrilla?.jefe_id || null;
  }
}
