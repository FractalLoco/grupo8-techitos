'use strict';
import AppDataSource from '../config/database.js';

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
      relations: ['cuadrilla', 'jefe', 'emergencia'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: emergenciaId },
      relations: ['cuadrilla', 'jefe', 'emergencia'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  static async listarPorCuadrilla(cuadrillaId) {
    return this.getRepository().find({
      where: { cuadrilla_id: cuadrillaId },
      relations: ['cuadrilla', 'jefe', 'emergencia'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  static async listarPorJefe(jefeId) {
    return this.getRepository().find({
      where: { jefe_id: jefeId },
      relations: ['cuadrilla', 'jefe', 'emergencia'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  static async actualizarEstado(id, estado, respuesta = null) {
    const repo = this.getRepository();
    await repo.update(id, { estado, respuesta });
    return repo.findOne({ where: { id }, relations: ['cuadrilla', 'jefe', 'emergencia'] });
  }

  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id }, relations: ['cuadrilla', 'jefe', 'emergencia'] });
  }
}
