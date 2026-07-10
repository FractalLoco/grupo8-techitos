'use strict';
import { SolicitudRepository } from '../repositories/solicitud.repository.js';
import { MovimientoHerramientaService } from '../services/movimiento-herramienta.service.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';

// Valores válidos alineados con los checks de la entidad Solicitud
const TIPOS_SOLICITUD_VALIDOS = ['herramienta', 'epp', 'material', 'otro'];
const ESTADOS_SOLICITUD_VALIDOS = ['aprobada', 'rechazada'];

export class SolicitudService {
  // El creador puede ser voluntario, jefe o coordinador. Para un voluntario se deriva
  // automáticamente su cuadrilla; de la cuadrilla se toman el jefe y la emergencia.
  static async crear({ creadorId, rolCreador, cuadrillaId, emergenciaId, tipo, descripcion, nombre_item = null, cantidad = 1 }) {
    let cuadrilla_id = cuadrillaId ? Number(cuadrillaId) : null;
    let emergencia_id = emergenciaId ? Number(emergenciaId) : null;

    // Valido los datos del ítem antes de resolver la cuadrilla para fallar temprano
    if (!TIPOS_SOLICITUD_VALIDOS.includes(tipo)) {
      throw new Error(`El tipo de solicitud debe ser uno de: ${TIPOS_SOLICITUD_VALIDOS.join(', ')}`);
    }
    const descripcionLimpia = String(descripcion || '').trim();
    if (!descripcionLimpia) {
      throw new Error('La descripción de la solicitud es obligatoria');
    }
    const cantidadNumero = Number(cantidad ?? 1);
    if (!Number.isInteger(cantidadNumero) || cantidadNumero < 1) {
      throw new Error('La cantidad debe ser un número entero mayor o igual a 1');
    }

    if (rolCreador === 'voluntario') {
      const membresia = await MiembroCuadrillaRepository.buscarVoluntarioEnCuadrilla(creadorId);
      if (!membresia) throw new Error('No perteneces a ninguna cuadrilla; no puedes crear solicitudes');
      cuadrilla_id = membresia.cuadrilla_id;
    }

    if (!cuadrilla_id) throw new Error('Debes indicar la cuadrilla de la solicitud');

    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrilla_id);
    if (!cuadrilla) throw new Error('Cuadrilla no encontrada');
    if (!emergencia_id) emergencia_id = cuadrilla.emergencia_id;

    return SolicitudRepository.crear({
      jefe_id: cuadrilla.jefe_id,
      solicitante_id: creadorId,
      cuadrilla_id,
      emergencia_id,
      tipo,
      descripcion: descripcionLimpia,
      nombre_item: nombre_item ? String(nombre_item).trim() : null,
      cantidad: cantidadNumero,
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

  static async listarPorSolicitante(usuarioId) {
    return SolicitudRepository.listarPorSolicitante(usuarioId);
  }

  static async listarPorJefeCuadrilla(jefeId) {
    return SolicitudRepository.listarPorJefeCuadrilla(jefeId);
  }

  static async actualizarEstado(id, estado, respuesta = null, aprobadorId = null) {
    if (!ESTADOS_SOLICITUD_VALIDOS.includes(estado)) {
      throw new Error(`Estado inválido. La solicitud solo puede marcarse como: ${ESTADOS_SOLICITUD_VALIDOS.join(' o ')}`);
    }

    const solicitud = await SolicitudRepository.buscarPorId(id);
    if (!solicitud) throw new Error('Solicitud no encontrada');
    if (solicitud.estado !== 'pendiente') throw new Error('La solicitud ya fue procesada');

    // Antes de aprobar con un ítem concreto, valida que haya stock disponible en el almacén.
    // Si no alcanza, no se cambia el estado: la solicitud queda pendiente con el mensaje de sin stock.
    if (estado === 'aprobada' && solicitud.nombre_item) {
      const necesita = solicitud.cantidad || 1;
      const disponible = await MovimientoHerramientaService.stockDisponible(solicitud.nombre_item, solicitud.tipo);
      if (disponible < necesita) {
        throw new Error(`Sin stock suficiente de "${solicitud.nombre_item}": disponibles ${disponible}, se solicitan ${necesita}`);
      }
    }

    const actualizada = await SolicitudRepository.actualizarEstado(id, estado, respuesta);

    // Al aprobar: registra automáticamente la salida en el inventario de movimientos
    if (estado === 'aprobada' && solicitud.nombre_item) {
      let personaRecibe = `Cuadrilla #${solicitud.cuadrilla_id}`;
      const receptorId = solicitud.solicitante_id || solicitud.jefe_id;
      try {
        const receptor = await UsuarioRepository.buscarPorId(receptorId);
        if (receptor?.nombre) personaRecibe = receptor.nombre;
      } catch { /* si no encuentra al receptor, usa el fallback */ }

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
        aprobadorId,
      );
    }

    return actualizada;
  }
}
