'use strict';
import { MensajeRepository } from '../repositories/mensaje.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';

export class MensajeService {
  static async enviarMensaje(datos) {
    return MensajeRepository.crear(datos);
  }

  static async listarPorCuadrilla(cuadrillaId, limite) {
    return MensajeRepository.listarPorCuadrilla(cuadrillaId, limite);
  }

  static async listarBroadcast(limite) {
    return MensajeRepository.listarBroadcast(limite);
  }

  static async usuarioEnCuadrilla(usuarioId, cuadrillaId) {
    const repo = MiembroCuadrillaRepository.getRepository();
    const existe = await repo.findOne({ where: { voluntario_id: usuarioId, cuadrilla_id: cuadrillaId } });
    return !!existe;
  }
}
