'use strict';
import AppDataSource from '../config/database.js';
import { MensajeRepository } from '../repositories/mensaje.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { NotificacionService } from './notificacion.service.js';

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

  static async obtenerCuadrillasAccesibles(usuario) {
    const ESTADOS_ACTIVOS = new Set(['activa', 'en_progreso']);

    if (usuario.rol === 'coordinador') {
      return CuadrillaRepository.listarActivas();
    }

    if (usuario.rol === 'jefe_cuadrilla') {
      return CuadrillaRepository.listarActivasPorJefe(usuario.id);
    }

    if (usuario.rol === 'voluntario') {
      const membresias = await MiembroCuadrillaRepository.listarPorVoluntario(usuario.id);
      return membresias
        .filter((m) => m.cuadrilla && ESTADOS_ACTIVOS.has(m.cuadrilla.estado))
        .map((m) => m.cuadrilla);
    }

    return [];
  }

  /**
   * Envía un mensaje y sus notificaciones asociadas dentro de una transacción.
   * Si falla cualquier notificación, se revierte el mensaje.
   *
   * @param {Object} datosMensaje - { cuadrilla_id, remitente_id, tipo, contenido, prioridad }
   * @param {Object} options
   * @param {boolean} options.esBroadcast - Si es broadcast de coordinador
   * @param {boolean} options.esAlertaEmergencia - Si es alerta de emergencia de jefe
   * @param {string} options.nombreCuadrilla - Nombre de la cuadrilla (para alertas)
   * @param {number} options.remitenteRol - Rol del remitente
   * @returns {Promise<Object>} El mensaje creado
   */
  static async enviarMensajeConNotificaciones(datosMensaje, options = {}) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Guardar el mensaje
      const mensaje = await MensajeRepository.crearConQueryRunner(datosMensaje, queryRunner);

      // 2. Preparar y guardar notificaciones según el tipo de mensaje
      const { esBroadcast, esAlertaEmergencia, nombreCuadrilla, remitenteRol } = options;
      const remitenteId = datosMensaje.remitente_id;

      if (esBroadcast) {
        const preparar = NotificacionService.prepararNotificacionesBroadcast(
          remitenteId,
          mensaje.id,
          datosMensaje.contenido,
        );
        await preparar(queryRunner);
      } else if (esAlertaEmergencia && datosMensaje.cuadrilla_id) {
        const preparar = NotificacionService.prepararNotificacionesAlerta(
          remitenteId,
          mensaje.id,
          nombreCuadrilla || 'Cuadrilla',
          datosMensaje.contenido,
          datosMensaje.cuadrilla_id,
        );
        await preparar(queryRunner);
      } else if (datosMensaje.cuadrilla_id) {
        // Mensaje privado de cuadrilla
        const esCoordinador = remitenteRol === 'coordinador';
        const preparar = NotificacionService.prepararNotificacionesMensajeCuadrilla(
          remitenteId,
          mensaje.id,
          datosMensaje.contenido,
          datosMensaje.cuadrilla_id,
          esCoordinador,
          datosMensaje.tipo,
          nombreCuadrilla || 'Cuadrilla',
        );
        await preparar(queryRunner);
      }

      // 3. Confirmar transacción
      await queryRunner.commitTransaction();

      // 4. Recargar con relaciones para el DTO
      const repo = MensajeRepository.getRepository();
      const mensajeCompleto = await repo.findOne({
        where: { id: mensaje.id },
        relations: { remitente: true },
      });

      return mensajeCompleto || mensaje;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
