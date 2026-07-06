'use strict';
import { SolicitudRepository } from '../repositories/solicitud.repository.js';
import { MovimientoHerramientaService } from '../services/movimiento-herramienta.service.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';

export class SolicitudService {
  static async crear(jefeId, cuadrillaId, emergenciaId, tipo, descripcion, nombre_item = null, cantidad = 1) {
    return SolicitudRepository.crear({
      jefe_id: jefeId,
      cuadrilla_id: cuadrillaId,
      emergencia_id: emergenciaId,
      tipo,
      descripcion,
      nombre_item: nombre_item || null,
      cantidad: cantidad || 1,
    });
  }

  static async listarTodas() {
    return SolicitudRepository.listarTodas();
  }

  static async listarPorEmergencia(emergenciaId) {
    return SolicitudRepository.listarPorEmergencia(emergenciaId);
  }

  static async listarPorCuadrilla(cuadrillaId) {
    return SolicitudRepository.listarPorCuadrilla(cuadrillaId);
  }

  static async listarPorJefe(jefeId) {
    return SolicitudRepository.listarPorJefe(jefeId);
  }

  static async actualizarEstado(id, estado, respuesta = null, coordinadorId = null) {
    const solicitud = await SolicitudRepository.buscarPorId(id);
    if (!solicitud) throw new Error('Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') throw new Error('La solicitud ya fue procesada');

    const actualizada = await SolicitudRepository.actualizarEstado(id, estado, respuesta);

    // Al aprobar: registra automáticamente la salida en el inventario de movimientos
    if (estado === 'aprobada' && solicitud.nombre_item) {
      let personaRecibe = `Cuadrilla #${solicitud.cuadrilla_id}`;
      try {
        const jefe = await UsuarioRepository.buscarPorId(solicitud.jefe_id);
        if (jefe?.nombre) personaRecibe = jefe.nombre;
      } catch { /* si no encuentra al jefe, usa el fallback */ }

      await MovimientoHerramientaService.registrarSalida(
        {
          nombre_item:      solicitud.nombre_item,
          cantidad:         solicitud.cantidad || 1,
          persona_recibe:   personaRecibe,
          motivo:           `Solicitud aprobada — ${solicitud.descripcion || solicitud.tipo}`,
          emergencia_id:    solicitud.emergencia_id,
          cuadrilla_id:     solicitud.cuadrilla_id,
          tipo_item:        solicitud.tipo,
          solicitud_id:     solicitud.id,
          observaciones:    respuesta || null,
        },
        coordinadorId,
      );
    }

    return actualizada;
  }
}
