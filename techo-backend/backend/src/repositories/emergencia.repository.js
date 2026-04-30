'use strict';
import AppDataSource from '../config/database.js';

export class EmergenciaRepository {
  static getRepository() {
    return AppDataSource.getRepository('Emergencia');
  }

  // Creo una nueva emergencia y la persisto en la base de datos
  static async crear(datos) {
    const repo = this.getRepository();
    const emergencia = repo.create(datos);
    return repo.save(emergencia);
  }

  // Busco una emergencia por su ID para obtener su detalle completo
  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  // Devuelvo las emergencias activas ordenadas por la más reciente primero
  static async listarActivas() {
    return this.getRepository().find({
      where: { estado: 'activa' },
      order: { fecha_inicio: 'DESC' },
    });
  }

  // Devuelvo todas las emergencias sin filtro de estado para el historial completo
  static async listarTodas() {
    return this.getRepository().find({ order: { fecha_inicio: 'DESC' } });
  }

  // Actualizo campos específicos de una emergencia y devuelvo el registro actualizado
  static async actualizar(id, datos) {
    const repo = this.getRepository();
    await repo.update(id, datos);
    return this.buscarPorId(id);
  }

  // Cierro la emergencia registrando la fecha de fin y cambiando el estado a 'finalizada'
  static async finalizar(id) {
    return this.actualizar(id, { estado: 'finalizada', fecha_fin: new Date() });
  }

  // Verifico si existe al menos una emergencia activa; lo uso en el servicio antes de crear cuadrillas
  static async existeActiva() {
    const count = await this.getRepository().count({ where: { estado: 'activa' } });
    return count > 0;
  }
}
