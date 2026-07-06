'use strict';
import AppDataSource from '../config/database.js';

const RELACIONES = ['cuadrilla', 'jefe', 'solicitante', 'emergencia'];

export class SolicitudRepository {
  static getRepository() {
    return AppDataSource.getRepository('Solicitud');
  }

  static async crear(datos) {
    const repo = this.getRepository();
    const solicitud = repo.create(datos);
    return repo.save(solicitud);
  }

  static async listarTodas() {
    return this.getRepository().find({
      relations: RELACIONES,
      order: { fecha_creacion: 'DESC' },
    });
  }

  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: emergenciaId },
      relations: RELACIONES,
      order: { fecha_creacion: 'DESC' },
    });
  }

  static async listarPorCuadrilla(cuadrillaId) {
    return this.getRepository().find({
      where: { cuadrilla_id: cuadrillaId },
      relations: RELACIONES,
      order: { fecha_creacion: 'DESC' },
    });
  }

  static async listarPorJefe(jefeId) {
    return this.getRepository().find({
      where: { jefe_id: jefeId },
      relations: RELACIONES,
      order: { fecha_creacion: 'DESC' },
    });
  }

  // "Mis solicitudes": las que creó este usuario. Incluye filas antiguas donde el
  // creador quedó guardado en jefe_id (antes de existir solicitante_id).
  static async listarPorSolicitante(usuarioId) {
    return this.getRepository()
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.cuadrilla', 'cuadrilla')
      .leftJoinAndSelect('s.jefe', 'jefe')
      .leftJoinAndSelect('s.solicitante', 'solicitante')
      .leftJoinAndSelect('s.emergencia', 'emergencia')
      .where('s.solicitante_id = :id', { id: usuarioId })
      .orWhere('(s.solicitante_id IS NULL AND s.jefe_id = :id)', { id: usuarioId })
      .orderBy('s.fecha_creacion', 'DESC')
      .getMany();
  }

  // Solicitudes de las cuadrillas lideradas por este jefe (para que las apruebe/rechace).
  static async listarPorJefeCuadrilla(jefeId) {
    return this.getRepository()
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.cuadrilla', 'cuadrilla')
      .leftJoinAndSelect('s.jefe', 'jefe')
      .leftJoinAndSelect('s.solicitante', 'solicitante')
      .leftJoinAndSelect('s.emergencia', 'emergencia')
      .where('cuadrilla.jefe_id = :jefeId', { jefeId })
      .orderBy('s.fecha_creacion', 'DESC')
      .getMany();
  }

  static async actualizarEstado(id, estado, respuesta = null) {
    const repo = this.getRepository();
    await repo.update(id, { estado, respuesta });
    return repo.findOne({ where: { id }, relations: RELACIONES });
  }

  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id }, relations: RELACIONES });
  }
}
