'use strict';
import AppDataSource from '../config/database.js';

export class ZonaPeligroRepository {
  static getRepository() {
    return AppDataSource.getRepository('ZonaPeligro');
  }

  // Persisto una zona nueva con las coordenadas, radio y tipo que el coordinador definió
  static async crear(datos) {
    const repo = this.getRepository();
    const zona = repo.create(datos);
    return repo.save(zona);
  }

  // Busco una zona por ID para validarla antes de editar o eliminar
  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  // Traigo todas las zonas de una emergencia para pintarlas en el mapa
  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: emergenciaId },
      order: { creado_en: 'DESC' },
    });
  }

  // Actualizo los campos editables de una zona: radio, tipo, descripcion, comentarios
  static async actualizar(id, datos) {
    const repo = this.getRepository();
    await repo.update(id, datos);
    return this.buscarPorId(id);
  }

  // Elimino una zona del mapa; solo el coordinador puede hacer esto
  static async eliminar(id) {
    const repo = this.getRepository();
    await repo.delete(id);
  }
}
