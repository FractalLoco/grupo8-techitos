'use strict';
import { SolicitudRepository } from '../repositories/solicitud.repository.js';

export class SolicitudService {
  static async crear(jefeId, cuadrillaId, emergenciaId, tipo, descripcion) {
    return SolicitudRepository.crear({
      jefe_id: jefeId,
      cuadrilla_id: cuadrillaId,
      emergencia_id: emergenciaId,
      tipo,
      descripcion,
    });
  }

  static async listarPorEmergencia(emergenciaId) {
    return SolicitudRepository.listarPorEmergencia(emergenciaId);
  }

  static async listarPorCuadrilla(cuadrillaId) {
    return SolicitudRepository.listarPorCuadrilla(cuadrillaId);
  }

  static async actualizarEstado(id, estado, respuesta = null) {
    const solicitud = await SolicitudRepository.buscarPorId(id);
    if (!solicitud) throw new Error('Solicitud no encontrada');
    return SolicitudRepository.actualizarEstado(id, estado, respuesta);
  }
}
