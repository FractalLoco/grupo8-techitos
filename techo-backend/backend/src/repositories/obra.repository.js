'use strict';
import AppDataSource from '../config/database.js';

export class ObraRepository {
  static getRepository() {
    return AppDataSource.getRepository('Obra');
  }

  // Se guarda la obra nueva con sus coordenadas y descripción
  static async crear(datos) {
    const repo = this.getRepository();
    const obra = repo.create(datos);
    return repo.save(obra);
  }

  // Se busca una obra por su ID, útil antes de asignarla a una cuadrilla
  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  // Se listan las obras de una emergencia, las más recientes primero
  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: emergenciaId },
      order: { fecha_creacion: 'DESC' },
    });
  }

  // Se listan todas las obras del sistema sin filtrar por emergencia
  static async listarTodas() {
    return this.getRepository().find({ order: { fecha_creacion: 'DESC' } });
  }

  // Se actualiza lo que se necesite y se devuelve el registro ya modificado
  static async actualizar(id, datos) {
    const repo = this.getRepository();
    await repo.update(id, datos);
    return this.buscarPorId(id);
  }
}
