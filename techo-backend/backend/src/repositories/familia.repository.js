'use strict';
import AppDataSource from '../config/database.js';

export class FamiliaRepository {
  static getRepository() {
    return AppDataSource.getRepository('Familia');
  }

  // Registro una nueva familia afectada y la persisto en la base de datos
  static async crear(datos) {
    const repo = this.getRepository();
    const familia = repo.create(datos);
    return repo.save(familia);
  }

  // Busco una familia por su ID para operaciones de actualización o eliminación
  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  // Listo todas las familias vinculadas a una emergencia específica
  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({ where: { emergencia_id: emergenciaId } });
  }

  // Actualizo los datos de una familia y devuelvo el registro con los cambios aplicados
  static async actualizar(id, datos) {
    const repo = this.getRepository();
    await repo.update(id, datos);
    return this.buscarPorId(id);
  }

  // Elimino una familia solo si existe; devuelvo sus datos antes de borrarla
  static async eliminar(id) {
    const repo = this.getRepository();
    const familia = await this.buscarPorId(id);
    if (familia) await repo.delete(id);
    return familia;
  }
}
