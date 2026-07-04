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

  // Crea un mensaje usando un queryRunner para participar en una transacción
  static async crearConQueryRunner(datos, queryRunner) {
    const repo = queryRunner.manager.getRepository('Mensaje');
    const m = repo.create(datos);
    return repo.save(m);
  }

  static async listarPorCuadrilla(cuadrillaId, limite = 200) {
    return this.getRepository().find({
      where: { cuadrilla_id: cuadrillaId },
      order: { creado_en: 'ASC' },
      take: limite,
      relations: { remitente: true },
    });
  }

  static async listarBroadcast(limite = 200) {
    return this.getRepository()
      .createQueryBuilder('mensaje')
      .leftJoinAndSelect('mensaje.remitente', 'remitente')
      .where('mensaje.cuadrilla_id IS NULL')
      .andWhere('remitente.rol = :rol', { rol: 'coordinador' })
      .orderBy('mensaje.creado_en', 'ASC')
      .take(limite)
      .getMany();
  }
}
