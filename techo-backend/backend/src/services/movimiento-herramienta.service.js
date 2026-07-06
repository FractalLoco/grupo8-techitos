'use strict';
import { MovimientoHerramientaRepository } from '../repositories/movimiento-herramienta.repository.js';

const TIPOS_VALIDOS = ['herramienta', 'epp', 'material', 'otro'];

export class MovimientoHerramientaService {
  static async registrarSalida(datos, usuarioId) {
    const { nombre_item, cantidad, persona_recibe, motivo, obra_descripcion, emergencia_id, cuadrilla_id, tipo_item, observaciones, solicitud_id } = datos;

    if (!nombre_item?.trim()) throw new Error('El nombre del ítem es requerido');
    if (!persona_recibe?.trim()) throw new Error('La persona que recibe es requerida');
    if (!motivo?.trim()) throw new Error('El motivo es requerido');
    if (cantidad !== undefined && (isNaN(cantidad) || cantidad < 1)) throw new Error('La cantidad debe ser un número positivo');
    if (tipo_item && !TIPOS_VALIDOS.includes(tipo_item)) throw new Error(`El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);

    return MovimientoHerramientaRepository.crear({
      nombre_item: nombre_item.trim(),
      cantidad: Number(cantidad) || 1,
      persona_recibe: persona_recibe.trim(),
      motivo: motivo.trim(),
      obra_descripcion: obra_descripcion?.trim() || null,
      emergencia_id: emergencia_id || null,
      cuadrilla_id: cuadrilla_id || null,
      tipo_item: tipo_item || 'herramienta',
      tipo_movimiento: 'salida',
      solicitud_id: solicitud_id || null,
      estado: 'activo',
      registrado_por: usuarioId,
      observaciones: observaciones?.trim() || null,
    });
  }

  static async registrarStockEntrada(datos, usuarioId) {
    const { nombre_item, cantidad, tipo_item, observaciones } = datos;

    if (!nombre_item?.trim()) throw new Error('El nombre del ítem es requerido');
    if (cantidad !== undefined && (isNaN(cantidad) || cantidad < 1)) throw new Error('La cantidad debe ser un número positivo');
    if (tipo_item && !TIPOS_VALIDOS.includes(tipo_item)) throw new Error(`El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);

    return MovimientoHerramientaRepository.crear({
      nombre_item: nombre_item.trim(),
      cantidad: Number(cantidad) || 1,
      persona_recibe: 'Almacén TECHO',
      motivo: 'Entrada de stock al inventario',
      tipo_item: tipo_item || 'herramienta',
      tipo_movimiento: 'entrada_stock',
      estado: 'devuelto',
      registrado_por: usuarioId,
      observaciones: observaciones?.trim() || null,
    });
  }

  static async listarTodos() {
    return MovimientoHerramientaRepository.listarTodos();
  }

  static async listarPorEmergencia(emergenciaId) {
    return MovimientoHerramientaRepository.listarPorEmergencia(emergenciaId);
  }

  static async listarPorCuadrilla(cuadrillaId) {
    return MovimientoHerramientaRepository.listarPorCuadrilla(cuadrillaId);
  }

  static async registrarEntrada(id, observaciones) {
    const mov = await MovimientoHerramientaRepository.buscarPorId(id);
    if (!mov) throw new Error('Movimiento no encontrado');
    if (mov.estado === 'devuelto') throw new Error('Este ítem ya fue registrado como devuelto');
    return MovimientoHerramientaRepository.registrarEntrada(id, observaciones);
  }

  // Calcula cuántas unidades de un ítem están disponibles en el almacén
  static async stockDisponible(nombre_item, tipo_item) {
    return MovimientoHerramientaRepository.stockDisponible(nombre_item, tipo_item);
  }
}
