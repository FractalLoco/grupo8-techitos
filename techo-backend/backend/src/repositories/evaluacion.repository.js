'use strict';
import AppDataSource from '../config/database.js';

export class EvaluacionRepository {
  static getRepository() {
    return AppDataSource.getRepository('Evaluacion');
  }

  // Creo y guardo una nueva evaluación vinculada a una familia y a su emergencia
  static async crear(datos) {
    const repo = this.getRepository();
    const evaluacion = repo.create(datos);
    return repo.save(evaluacion);
  }

  // Busco una evaluación por su ID para actualizarla o consultarla individualmente
  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  // Listo todas las evaluaciones realizadas dentro de una emergencia
  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({ where: { emergencia_id: emergenciaId } });
  }

  // Listo todas las evaluaciones que corresponden a una familia específica
  static async listarPorFamilia(familiaId) {
    return this.getRepository().find({ where: { familia_id: familiaId } });
  }

  // Actualizo los campos de una evaluación y devuelvo el registro actualizado
  static async actualizar(id, datos) {
    const repo = this.getRepository();
    await repo.update(id, datos);
    return this.buscarPorId(id);
  }

  // Cambio solo el estado de la evaluación: pendiente → en_proceso → completada
  static async cambiarEstado(id, estado) {
    return this.actualizar(id, { estado });
  }
}
