'use strict';
import AppDataSource from '../config/database.js';

export class MiembroCuadrillaRepository {
  static getRepository() {
    return AppDataSource.getRepository('MiembroCuadrilla');
  }

  // Agrego un voluntario a la cuadrilla creando el registro de membresía
  static async agregar(datos) {
    const repo = this.getRepository();
    const miembro = repo.create(datos);
    return repo.save(miembro);
  }

  // Listo todos los miembros que pertenecen a una cuadrilla específica
  static async listarPorCuadrilla(cuadrillaId) {
    return this.getRepository().find({ where: { cuadrilla_id: cuadrillaId } });
  }

  // Cuento los integrantes actuales para verificar el límite antes de agregar o eliminar
  static async contar(cuadrillaId) {
    return this.getRepository().count({ where: { cuadrilla_id: cuadrillaId } });
  }

  // Elimino a un voluntario específico de una cuadrilla usando ambas claves foráneas
  static async eliminar(cuadrillaId, voluntarioId) {
    return this.getRepository().delete({ cuadrilla_id: cuadrillaId, voluntario_id: voluntarioId });
  }

  // Elimino a todos los miembros de una cuadrilla cuando esta se completa o desarma
  static async eliminarTodos(cuadrillaId) {
    return this.getRepository().delete({ cuadrilla_id: cuadrillaId });
  }

  // Verifico si un voluntario ya pertenece a alguna cuadrilla activa del sistema
  static async buscarVoluntarioEnCuadrilla(voluntarioId) {
    return this.getRepository().findOne({ where: { voluntario_id: voluntarioId } });
  }

  // Comprueba si un usuario (voluntario) es miembro de una cuadrilla específica
  static async existeMiembro(voluntarioId, cuadrillaId) {
    const registro = await this.getRepository().findOne({ where: { voluntario_id: voluntarioId, cuadrilla_id: cuadrillaId } });
    return !!registro;
  }

  // Listo todas las membresías de un voluntario con la relación a cuadrilla
  static async listarPorVoluntario(voluntarioId) {
    return this.getRepository().find({
      where: { voluntario_id: voluntarioId },
      relations: ['cuadrilla'],
    });
  }
}
