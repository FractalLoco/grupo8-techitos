'use strict';
import { HerramientaRepository } from '../repositories/herramienta.repository.js';

export class HerramientaService {
  // Registro una herramienta individual asignándola a la cuadrilla indicada.
  static async registrar(cuadrillaId, nombre) {
    return HerramientaRepository.registrar({ cuadrilla_id: cuadrillaId, nombre });
  }

  // Devuelvo todas las herramientas asociadas a una cuadrilla para su revisión o inventario.
  static async listarPorCuadrilla(cuadrillaId) {
    return HerramientaRepository.listarPorCuadrilla(cuadrillaId);
  }

  // Actualizo el estado de una herramienta (buena, dañada, perdida, etc.) junto con observaciones opcionales.
  static async actualizarEstado(id, estado, observaciones = null) {
    return HerramientaRepository.actualizarEstado(id, estado, observaciones);
  }

  // Genero el balance consolidado de herramientas de una cuadrilla para el cierre de la obra.
  static async generarBalance(cuadrillaId) {
    return HerramientaRepository.generarBalance(cuadrillaId);
  }

  // Registro múltiples herramientas en lote para agilizar el proceso de preparación de la cuadrilla.
  static async registrarHerramientasMasivas(cuadrillaId, nombres) {
    const resultados = [];
    for (const nombre of nombres) {
      const herramienta = await HerramientaRepository.registrar({ cuadrilla_id: cuadrillaId, nombre });
      resultados.push(herramienta);
    }
    return resultados;
  }
}
