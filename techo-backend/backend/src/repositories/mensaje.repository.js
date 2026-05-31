'use strict';
import AppDataSource from '../config/database.js';

export class MensajeRepository {
  static getRepository() {
    return AppDataSource.getRepository('Mensaje');
  }

  static async crear(datos) {
    const repo = this.getRepository();
    const m = repo.create(datos);
    return repo.save(m);
  }

  static async listarPorCuadrilla(cuadrillaId, limite = 200) {
    return this.getRepository().find({ where: { cuadrilla_id: cuadrillaId }, order: { creado_en: 'DESC' }, take: limite });
  }

  static async listarBroadcast(limite = 200) {
    return this.getRepository().find({ where: { cuadrilla_id: null }, order: { creado_en: 'DESC' }, take: limite });
  }
}
