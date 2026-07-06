'use strict';
import { MensajeService } from '../services/mensaje.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { emitirMensajeChat } from '../realtime/chat.socket.js';

const FORMATOS_FOTO = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const ESTADOS_CUADRILLA_ACTIVA = new Set(['activa', 'en_progreso']);
const DIRECTORIO_FOTOS = path.resolve(process.cwd(), 'uploads', 'chat');

export const enviarMensaje = async (req, res) => {
  try {
    const remitente_id = req.usuario.id;
    const body = req.body || {};
    const cuadrilla_id = body.cuadrilla_id ? parseInt(body.cuadrilla_id, 10) : null;
    if (Object.prototype.hasOwnProperty.call(body, 'archivo_url')) {
      return respuestaError(res, 400, 'No se permite enviar una URL de archivo manualmente');
    }
    const { tipo = 'texto', contenido = null, prioridad = false } = body;

    // Determinar el tipo de mensaje y permisos
    const esBroadcast = !cuadrilla_id;
    const esAlertaEmergencia = tipo === 'emergencia';
    let nombreCuadrilla = null;

    if (cuadrilla_id) {
      const isCoordinador = req.usuario.rol === 'coordinador';
      if (!isCoordinador) {
        const esta = await MensajeService.usuarioEnCuadrilla(remitente_id, cuadrilla_id);
        if (!esta) return respuestaError(res, 403, 'No perteneces a esa cuadrilla');
      }
      const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrilla_id);
      nombreCuadrilla = cuadrilla?.nombre || null;
    } else {
      // Broadcast solo para coordinadores
      if (req.usuario.rol !== 'coordinador') {
        return respuestaError(res, 403, 'No tienes permiso para enviar mensajes broadcast');
      }
    }

    const mensaje = await MensajeService.enviarMensajeConNotificaciones(
      { cuadrilla_id, remitente_id, tipo, contenido, prioridad },
      {
        esBroadcast,
        esAlertaEmergencia,
        nombreCuadrilla,
        remitenteRol: req.usuario.rol,
      },
    );
    const mensajeDTO = MensajeService.toDTO(mensaje, req.usuario?.nombre || null);
    emitirMensajeChat(mensajeDTO);
    return respuestaExito(res, 201, 'Mensaje enviado', { mensaje: mensajeDTO });
  } catch (error) {
    console.error('error enviarMensaje:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const enviarFotoCuadrilla = async (req, res) => {
  let rutaGuardada = null;

  try {
    const cuadrillaId = Number.parseInt(req.params.cuadrillaId, 10);
    if (!Number.isInteger(cuadrillaId) || cuadrillaId <= 0) {
      return respuestaError(res, 400, 'El ID de la cuadrilla no es valido');
    }

    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) return respuestaError(res, 404, 'Cuadrilla no encontrada');
    const esJefeCuadrilla = cuadrilla.jefe_id === req.usuario.id;
    const esCoordinador = req.usuario.rol === 'coordinador';
    const tieneAcceso = esCoordinador
      || esJefeCuadrilla
      || await MensajeService.usuarioEnCuadrilla(req.usuario.id, cuadrillaId);
    if (!tieneAcceso) {
      return respuestaError(res, 403, 'No tienes permiso para subir fotos a esta cuadrilla');
    }
    if (!ESTADOS_CUADRILLA_ACTIVA.has(cuadrilla.estado)) {
      return respuestaError(res, 403, 'La cuadrilla debe estar activa para subir fotos');
    }
    if (!req.file) return respuestaError(res, 400, 'Debes seleccionar una foto');

    const tipoDetectado = await fileTypeFromBuffer(req.file.buffer);
    const extension = tipoDetectado && FORMATOS_FOTO.get(tipoDetectado.mime);
    if (!extension) {
      return respuestaError(res, 400, 'Formato no permitido. Usa JPG, PNG o WebP');
    }

    const tipoHitoRecibido = typeof req.body.tipo_hito === 'string'
      ? req.body.tipo_hito.toLowerCase()
      : null;
    if (tipoHitoRecibido && !['avance', 'finalizado'].includes(tipoHitoRecibido)) {
      return respuestaError(res, 400, 'Tipo de hito invalido. Usa avance o finalizado');
    }
    if (tipoHitoRecibido && !esJefeCuadrilla) {
      return respuestaError(res, 403, 'Solo el jefe de esta cuadrilla puede registrar avances o finalizaciones');
    }
    const tipoHito = tipoHitoRecibido;

    await mkdir(DIRECTORIO_FOTOS, { recursive: true });
    const nombreArchivo = `${randomUUID()}.${extension}`;
    rutaGuardada = path.join(DIRECTORIO_FOTOS, nombreArchivo);
    await writeFile(rutaGuardada, req.file.buffer, { flag: 'wx' });

    const contenido = typeof req.body.contenido === 'string'
      ? req.body.contenido.trim() || null
      : null;
    const archivoUrl = `/uploads/chat/${nombreArchivo}`;
    const mensaje = await MensajeService.enviarMensajeConNotificaciones(
      {
        cuadrilla_id: cuadrillaId,
        remitente_id: req.usuario.id,
        tipo: tipoHito || 'imagen',
        contenido,
        archivo_url: archivoUrl,
        prioridad: false,
      },
      {
        esBroadcast: false,
        esAlertaEmergencia: false,
        nombreCuadrilla: cuadrilla.nombre,
        remitenteRol: req.usuario.rol,
      },
    );

    rutaGuardada = null;
    const mensajeRespuesta = tipoHito === 'finalizado'
      ? 'Finalizacion registrada con foto'
      : tipoHito === 'avance'
        ? 'Hito de avance registrado con foto'
        : 'Foto de avance enviada';
    const mensajeDTO = MensajeService.toDTO(mensaje, req.usuario?.nombre || null);
    emitirMensajeChat(mensajeDTO);
    return respuestaExito(res, 201, mensajeRespuesta, { mensaje: mensajeDTO });
  } catch (error) {
    if (rutaGuardada) {
      await unlink(rutaGuardada).catch(() => {});
    }
    console.error('error enviarFotoCuadrilla:', error.message);
    return respuestaError(res, 500, 'No se pudo guardar la foto de avance');
  }
};

export const listarMensajesCuadrilla = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const cuadrilla_id = parseInt(req.params.cuadrillaId, 10);
    const esCoordinador = req.usuario.rol === 'coordinador';
    if (!esCoordinador) {
      const esta = await MensajeService.usuarioEnCuadrilla(usuario_id, cuadrilla_id);
      if (!esta) return respuestaError(res, 403, 'No tienes permiso para ver este chat');
    }
    const mensajes = await MensajeService.listarPorCuadrilla(cuadrilla_id);
    return respuestaExito(res, 200, 'Mensajes obtenidos', { mensajes });
  } catch (error) {
    console.error('error listarMensajesCuadrilla:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const listarBroadcast = async (req, res) => {
  try {
    const mensajes = await MensajeService.listarBroadcast();
    return respuestaExito(res, 200, 'Mensajes broadcast', { mensajes });
  } catch (error) {
    console.error('error listarBroadcast:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const listarCuadrillasAccesibles = async (req, res) => {
  try {
    const cuadrillas = await MensajeService.obtenerCuadrillasAccesibles(req.usuario);
    return respuestaExito(res, 200, 'Cuadrillas obtenidas', { cuadrillas });
  } catch (error) {
    console.error('error listarCuadrillasAccesibles:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const enviarFotoCanalCoordinador = async (req, res) => {
  let rutaGuardada = null;

  try {
    const canal = req.params.canal;
    if (!['broadcast', 'coordinadores', 'jefes'].includes(canal)) {
      return respuestaError(res, 404, 'Canal no encontrado');
    }
    if (canal === 'jefes' && req.usuario.rol !== 'jefe_cuadrilla') {
      return respuestaError(res, 403, 'Solo los jefes pueden enviar fotos en este canal');
    }
    if (canal !== 'jefes' && req.usuario.rol !== 'coordinador') {
      return respuestaError(res, 403, 'Solo coordinacion puede enviar fotos en este canal');
    }
    if (!req.file) return respuestaError(res, 400, 'Debes seleccionar una foto');

    const tipoDetectado = await fileTypeFromBuffer(req.file.buffer);
    const extension = tipoDetectado && FORMATOS_FOTO.get(tipoDetectado.mime);
    if (!extension) {
      return respuestaError(res, 400, 'Formato no permitido. Usa JPG, PNG o WebP');
    }

    await mkdir(DIRECTORIO_FOTOS, { recursive: true });
    const nombreArchivo = `${randomUUID()}.${extension}`;
    rutaGuardada = path.join(DIRECTORIO_FOTOS, nombreArchivo);
    await writeFile(rutaGuardada, req.file.buffer, { flag: 'wx' });

    const contenido = typeof req.body.contenido === 'string'
      ? req.body.contenido.trim() || null
      : null;
    const datosMensaje = {
      cuadrilla_id: null,
      remitente_id: req.usuario.id,
      tipo: canal === 'coordinadores'
        ? 'coordinadores'
        : canal === 'jefes'
          ? 'jefes'
          : 'imagen',
      contenido,
      archivo_url: `/uploads/chat/${nombreArchivo}`,
      prioridad: false,
    };
    const mensaje = canal === 'broadcast'
      ? await MensajeService.enviarMensajeConNotificaciones(datosMensaje, {
          esBroadcast: true,
          esAlertaEmergencia: false,
          remitenteRol: req.usuario.rol,
        })
      : await MensajeService.enviarMensaje(datosMensaje);

    rutaGuardada = null;
    const mensajeDTO = MensajeService.toDTO(mensaje, req.usuario?.nombre || null);
    emitirMensajeChat(mensajeDTO);
    return respuestaExito(res, 201, 'Foto enviada', { mensaje: mensajeDTO });
  } catch (error) {
    if (rutaGuardada) await unlink(rutaGuardada).catch(() => {});
    console.error('error enviarFotoCanalCoordinador:', error.message);
    return respuestaError(res, 500, 'No se pudo guardar la foto');
  }
};

export const listarChatCoordinadores = async (req, res) => {
  try {
    const mensajes = await MensajeService.listarCoordinadores();
    return respuestaExito(res, 200, 'Mensajes de coordinadores obtenidos', { mensajes });
  } catch (error) {
    console.error('error listarChatCoordinadores:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const enviarChatCoordinadores = async (req, res) => {
  try {
    const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
    if (!contenido) return respuestaError(res, 400, 'Escribe un mensaje antes de enviar');

    const mensaje = await MensajeService.enviarMensaje({
      cuadrilla_id: null,
      remitente_id: req.usuario.id,
      tipo: 'coordinadores',
      contenido,
      archivo_url: null,
      prioridad: Boolean(req.body?.prioridad),
    });

    const mensajeDTO = MensajeService.toDTO(mensaje, req.usuario.nombre || null);
    emitirMensajeChat(mensajeDTO);
    return respuestaExito(res, 201, 'Mensaje enviado', { mensaje: mensajeDTO });
  } catch (error) {
    console.error('error enviarChatCoordinadores:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const listarChatJefes = async (req, res) => {
  try {
    const mensajes = await MensajeService.listarJefes();
    return respuestaExito(res, 200, 'Mensajes de jefes obtenidos', { mensajes });
  } catch (error) {
    console.error('error listarChatJefes:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const enviarChatJefes = async (req, res) => {
  try {
    const contenido = typeof req.body?.contenido === 'string' ? req.body.contenido.trim() : '';
    if (!contenido) return respuestaError(res, 400, 'Escribe un mensaje antes de enviar');

    const mensaje = await MensajeService.enviarMensaje({
      cuadrilla_id: null,
      remitente_id: req.usuario.id,
      tipo: 'jefes',
      contenido,
      archivo_url: null,
      prioridad: false,
    });

    const mensajeDTO = MensajeService.toDTO(mensaje, req.usuario.nombre || null);
    emitirMensajeChat(mensajeDTO);
    return respuestaExito(res, 201, 'Mensaje enviado', { mensaje: mensajeDTO });
  } catch (error) {
    console.error('error enviarChatJefes:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const listarIntegrantesCuadrilla = async (req, res) => {
  try {
    const cuadrillaId = Number.parseInt(req.params.cuadrillaId, 10);
    if (!Number.isInteger(cuadrillaId) || cuadrillaId <= 0) {
      return respuestaError(res, 400, 'El ID de la cuadrilla no es valido');
    }

    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) return respuestaError(res, 404, 'Cuadrilla no encontrada');

    if (req.usuario.rol !== 'coordinador') {
      const tieneAcceso = await MensajeService.usuarioEnCuadrilla(req.usuario.id, cuadrillaId);
      if (!tieneAcceso) {
        return respuestaError(res, 403, 'No tienes permiso para ver los integrantes de esta cuadrilla');
      }
    }

    const integrantes = await MensajeService.obtenerIntegrantesCuadrilla(cuadrillaId);
    return respuestaExito(res, 200, 'Integrantes obtenidos', { integrantes });
  } catch (error) {
    console.error('error listarIntegrantesCuadrilla:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const dashboardPublico = async (req, res) => {
  try {
    const AppDataSource = (await import('../config/database.js')).default;

    // Casas finalizadas: mensajes con tipo 'finalizado'
    const resultadoCasas = await AppDataSource.query(
      "SELECT COUNT(*)::int AS count FROM mensajes WHERE tipo = 'finalizado'"
    );
    const casasFinalizadas = resultadoCasas[0]?.count ?? 0;

    // Voluntarios desplegados: miembros únicos en cuadrillas activas
    const resultadoVoluntarios = await AppDataSource.query(
      `SELECT COUNT(DISTINCT mc.voluntario_id)::int AS count
       FROM miembros_cuadrilla mc
       JOIN usuarios u ON u.id = mc.voluntario_id
       JOIN cuadrillas c ON c.id = mc.cuadrilla_id
       WHERE u.rol = 'voluntario'
         AND c.estado IN ('activa', 'en_progreso')`
    );
    const voluntariosDesplegados = resultadoVoluntarios[0]?.count ?? 0;

    const resultadoCuadrillas = await AppDataSource.query(
      "SELECT COUNT(*)::int AS count FROM cuadrillas WHERE estado IN ('activa', 'en_progreso')"
    );
    const cuadrillasActivas = resultadoCuadrillas[0]?.count ?? 0;

    const resultadoEmergencias = await AppDataSource.query(
      "SELECT COUNT(*)::int AS count FROM emergencias WHERE estado = 'activa'"
    );
    const emergenciasActivas = resultadoEmergencias[0]?.count ?? 0;

    const resultadoFecha = await AppDataSource.query(`
      SELECT GREATEST(
        (SELECT MAX(creado_en) FROM mensajes),
        (SELECT MAX(fecha_creacion) FROM cuadrillas),
        (SELECT MAX(fecha_inicio) FROM emergencias),
        (SELECT MAX(fecha_creacion) FROM obras),
        (SELECT MAX(creado_en) FROM familias)
      ) AS ultima_actualizacion
    `);
    const ultimaActualizacion = resultadoFecha[0]?.ultima_actualizacion ?? null;
    const aviso = ultimaActualizacion === null
      ? 'Todavia no hay actualizaciones operativas registradas'
      : null;

    const datos = {
      casas_finalizadas: casasFinalizadas,
      voluntarios_desplegados: voluntariosDesplegados,
      cuadrillas_activas: cuadrillasActivas,
      emergencias_activas: emergenciasActivas,
      ultima_actualizacion: ultimaActualizacion,
      aviso,
    };

    return respuestaExito(res, 200, 'Dashboard público', datos);
  } catch (error) {
    console.error('error dashboardPublico:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};
