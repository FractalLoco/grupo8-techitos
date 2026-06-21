'use strict';
import AppDataSource from '../config/database.js';

export class ReporteRepository {
  static getRepository() {
    return AppDataSource.getRepository('Reporte');
  }

  // Creo un nuevo reporte y lo guardo en la base de datos
  static async crear(datos) {
    const repo = this.getRepository();
    const reporte = repo.create(datos);
    return repo.save(reporte);
  }

  // Busco un reporte por su ID con los datos del usuario que lo generó y la emergencia
  static async buscarPorId(id) {
    return this.getRepository().findOne({
      where: { id: Number(id) },
      relations: {
        generadoPor: true,
        emergencia: true,
      },
      // Solo devuelvo campos públicos del usuario, nunca la contraseña
      select: {
        generadoPor: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          rol: true,
        },
      },
    });
  }

  // Devuelvo todos los reportes ordenados del más reciente al más antiguo
  static async listarTodos() {
    return this.getRepository().find({
      order: { generado_en: 'DESC' },
      relations: {
        generadoPor: true,
      },
      select: {
        generadoPor: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          rol: true,
        },
      },
    });
  }

  // Devuelvo los reportes de una emergencia específica, del más reciente al más antiguo
  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: Number(emergenciaId) },
      order: { generado_en: 'DESC' },
      relations: {
        generadoPor: true,
      },
      select: {
        generadoPor: {
          id: true,
          nombre: true,
          rut: true,
          correo: true,
          rol: true,
        },
      },
    });
  }
}
