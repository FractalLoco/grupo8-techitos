'use strict';
import AppDataSource from '../config/database.js';

export class ZonaPeligroRepository {
  static getRepository() {
    return AppDataSource.getRepository('ZonaPeligro');
  }

  // Persisto una nueva zona de peligro con sus coordenadas, tipo y comentario
  static async crear(datos) {
    const repo = this.getRepository();
    const zona = repo.create(datos);
    return repo.save(zona);
  }

  // Listo todas las zonas de una emergencia para pintarlas en el mapa
  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: emergenciaId },
      order: { fecha_creacion: 'DESC' },
    });
  }

  // Busco una zona por ID antes de eliminarla o validarla
  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  // Elimino una zona del mapa segun su ID
  static async eliminar(id) {
    return this.getRepository().delete(id);
  }
}
