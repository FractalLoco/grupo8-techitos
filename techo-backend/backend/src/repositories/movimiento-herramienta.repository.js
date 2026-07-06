'use strict';
import AppDataSource from '../config/database.js';

export class MovimientoHerramientaRepository {
  static getRepository() {
    return AppDataSource.getRepository('MovimientoHerramienta');
  }

  static async crear(datos) {
    const repo = this.getRepository();
    const mov = repo.create(datos);
    return repo.save(mov);
  }

  static async listarTodos() {
    return this.getRepository().find({ order: { fecha_salida: 'DESC' } });
  }

  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: emergenciaId },
      order: { fecha_salida: 'DESC' },
    });
  }

  // Filtra movimientos de una cuadrilla específica (útil para el balance por equipo)
  static async listarPorCuadrilla(cuadrillaId) {
    return this.getRepository().find({
      where: { cuadrilla_id: cuadrillaId },
      order: { fecha_salida: 'DESC' },
    });
  }

  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  static async registrarEntrada(id, observaciones) {
    const repo = this.getRepository();
    await repo.update(id, {
      estado: 'devuelto',
      fecha_entrada: new Date(),
      observaciones: observaciones || null,
    });
    return repo.findOne({ where: { id } });
  }

  // Stock disponible = suma entradas_stock - suma salidas activas para un mismo nombre_item+tipo_item
  static async stockDisponible(nombre_item, tipo_item) {
    const repo = this.getRepository();
    const entradas = await repo.find({ where: { nombre_item, tipo_item, tipo_movimiento: 'entrada_stock' } });
    const salidas  = await repo.find({ where: { nombre_item, tipo_item, tipo_movimiento: 'salida', estado: 'activo' } });
    const totalEntradas = entradas.reduce((s, m) => s + (m.cantidad || 1), 0);
    const totalSalidas  = salidas.reduce((s, m) => s + (m.cantidad || 1), 0);
    return Math.max(0, totalEntradas - totalSalidas);
  }
}
