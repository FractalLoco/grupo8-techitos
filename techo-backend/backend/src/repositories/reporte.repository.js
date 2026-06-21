'use strict';
import AppDataSource from '../config/database.js';

export class ReporteRepository {
  static getRepository() {
    return AppDataSource.getRepository('Reporte');
  }

  static async crear(datos) {
    const repo = this.getRepository();
    return repo.save(repo.create(datos));
  }

  static consultaPublica(incluirSnapshot = false) {
    const campos = [
      'reporte.id',
      'reporte.emergencia_id',
      'reporte.generado_por',
      'reporte.nombre_archivo',
      'reporte.archivo_url',
      'reporte.generado_en',
      'emergencia.id',
      'emergencia.nombre',
      'emergencia.estado',
      'generadoPor.id',
      'generadoPor.nombre',
      'generadoPor.rol',
    ];
    if (incluirSnapshot) campos.push('reporte.datos_snapshot');

    return this.getRepository()
      .createQueryBuilder('reporte')
      .leftJoin('reporte.emergencia', 'emergencia')
      .leftJoin('reporte.generadoPor', 'generadoPor')
      .select(campos);
  }

  static async buscarPorId(id) {
    return this.consultaPublica(true)
      .where('reporte.id = :id', { id: Number(id) })
      .getOne();
  }

  static async listarTodos() {
    return this.consultaPublica(false)
      .orderBy('reporte.generado_en', 'DESC')
      .getMany();
  }

  static async listarPorEmergencia(emergenciaId) {
    return this.consultaPublica(false)
      .where('reporte.emergencia_id = :emergenciaId', { emergenciaId: Number(emergenciaId) })
      .orderBy('reporte.generado_en', 'DESC')
      .getMany();
  }
}
