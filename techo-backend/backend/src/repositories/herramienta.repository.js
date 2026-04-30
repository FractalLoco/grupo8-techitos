'use strict';
import AppDataSource from '../config/database.js';

export class HerramientaRepository {
  static getRepository() {
    return AppDataSource.getRepository('Herramienta');
  }

  // Registro una herramienta nueva asociándola a la cuadrilla que la recibe
  static async registrar(datos) {
    const repo = this.getRepository();
    const herramienta = repo.create(datos);
    return repo.save(herramienta);
  }

  // Listo todas las herramientas asignadas a una cuadrilla para su revisión o inventario
  static async listarPorCuadrilla(cuadrillaId) {
    return this.getRepository().find({ where: { cuadrilla_id: cuadrillaId } });
  }

  // Actualizo el estado de una herramienta y agrego observaciones si las hay
  static async actualizarEstado(id, estado, observaciones = null) {
    const repo = this.getRepository();
    await repo.update(id, { estado, observaciones });
    return this.getRepository().findOne({ where: { id } });
  }

  // Genero el balance de herramientas de una cuadrilla agrupando por estado.
  // Marco 'conDiferencias' si hay herramientas dañadas, perdidas o no devueltas para alertar al coordinador.
  static async generarBalance(cuadrillaId) {
    const herramientas = await this.listarPorCuadrilla(cuadrillaId);
    const balance = {
      total: herramientas.length,
      entregadas: herramientas.filter((h) => h.estado === 'entregada').length,
      buenas: herramientas.filter((h) => h.estado === 'buena').length,
      danadas: herramientas.filter((h) => h.estado === 'danada').length,
      perdidas: herramientas.filter((h) => h.estado === 'perdida').length,
      noDevueltas: herramientas.filter((h) => h.estado === 'no_devuelta').length,
      conDiferencias: false,
    };
    balance.conDiferencias = balance.danadas + balance.perdidas + balance.noDevueltas > 0;
    return balance;
  }
}
