'use strict';
import { MensajeRepository } from '../repositories/mensaje.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';

export class MensajeService {
  static toDTO(mensaje, remitenteNombreFallback = null) {
    return {
      id: mensaje.id,
      cuadrilla_id: mensaje.cuadrilla_id,
      remitente_id: mensaje.remitente_id,
      remitente_nombre: mensaje.remitente?.nombre || remitenteNombreFallback || null,
      tipo: mensaje.tipo,
      contenido: mensaje.contenido,
      archivo_url: mensaje.archivo_url,
      prioridad: mensaje.prioridad,
      creado_en: mensaje.creado_en,
    };
  }

  static async enviarMensaje(datos) {
    return MensajeRepository.crear(datos);
  }

  static async listarPorCuadrilla(cuadrillaId, limite) {
    const mensajes = await MensajeRepository.listarPorCuadrilla(cuadrillaId, limite);
    return mensajes.map((mensaje) => this.toDTO(mensaje));
  }

  static async listarBroadcast(limite) {
    const mensajes = await MensajeRepository.listarBroadcast(limite);
    return mensajes.map((mensaje) => this.toDTO(mensaje));
  }

  static async usuarioEnCuadrilla(usuarioId, cuadrillaId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) return false;
    if (cuadrilla.jefe_id === usuarioId) return true;

    const repo = MiembroCuadrillaRepository.getRepository();
    const existe = await repo.findOne({ where: { voluntario_id: usuarioId, cuadrilla_id: cuadrillaId } });
    return !!existe;
  }
}
