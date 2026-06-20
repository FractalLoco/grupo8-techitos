'use strict';
import { MensajeService } from '../services/mensaje.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

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

    if (cuadrilla_id) {
      const isCoordinador = req.usuario.rol === 'coordinador';
      if (!isCoordinador) {
        const esta = await MensajeService.usuarioEnCuadrilla(remitente_id, cuadrilla_id);
        if (!esta) return respuestaError(res, 403, 'No perteneces a esa cuadrilla');
      }
    } else {
      // Si no hay cuadrilla_id, es un broadcast. Solo permitido para coordinadores.
      if (req.usuario.rol !== 'coordinador') {
        return respuestaError(res, 403, 'No tienes permiso para enviar mensajes broadcast');
      }
    }

    const mensaje = await MensajeService.enviarMensaje({ cuadrilla_id, remitente_id, tipo, contenido, prioridad });
    const mensajeDTO = MensajeService.toDTO(mensaje, req.usuario?.nombre || null);
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
    if (cuadrilla.jefe_id !== req.usuario.id) {
      return respuestaError(res, 403, 'Solo el jefe de esta cuadrilla puede subir fotos');
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

    await mkdir(DIRECTORIO_FOTOS, { recursive: true });
    const nombreArchivo = `${randomUUID()}.${extension}`;
    rutaGuardada = path.join(DIRECTORIO_FOTOS, nombreArchivo);
    await writeFile(rutaGuardada, req.file.buffer, { flag: 'wx' });

    const contenido = typeof req.body.contenido === 'string'
      ? req.body.contenido.trim() || null
      : null;
    const archivoUrl = `/uploads/chat/${nombreArchivo}`;
    const mensaje = await MensajeService.enviarMensaje({
      cuadrilla_id: cuadrillaId,
      remitente_id: req.usuario.id,
      tipo: 'imagen',
      contenido,
      archivo_url: archivoUrl,
      prioridad: false,
    });

    rutaGuardada = null;
    return respuestaExito(res, 201, 'Foto de avance enviada', {
      mensaje: MensajeService.toDTO(mensaje, req.usuario?.nombre || null),
    });
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

export const dashboardPublico = async (req, res) => {
  try {
    const AppDataSource = (await import('../config/database.js')).default;
    const r = await AppDataSource.query("SELECT COUNT(*)::int AS count FROM mensajes WHERE tipo = 'finalizado'");
    const casasFinalizadas = r[0] ? r[0].count : 0;

    const voluntarios = await AppDataSource.query(
      `SELECT COUNT(DISTINCT mc.voluntario_id)::int AS count
       FROM miembros_cuadrilla mc
       JOIN usuarios u ON u.id = mc.voluntario_id
       JOIN cuadrillas c ON c.id = mc.cuadrilla_id
       WHERE u.rol = 'voluntario' AND c.estado IN ('activa', 'en_progreso')`
    );
    const cuadrillasAct = await AppDataSource.query("SELECT COUNT(*)::int as count FROM cuadrillas WHERE estado IN ('activa', 'en_progreso')");

    const datos = {
      casas_finalizadas: casasFinalizadas || 0,
      voluntarios_desplegados: (voluntarios[0] && voluntarios[0].count) || 0,
      cuadrillas_activas: (cuadrillasAct[0] && cuadrillasAct[0].count) || 0,
    };

    const reciente = await AppDataSource.query(`SELECT 1 FROM mensajes WHERE creado_en > NOW() - INTERVAL '24 hours' LIMIT 1`);
    const aviso = (reciente && reciente.length === 0) ? 'Los datos pueden no estar actualizados' : null;

    return respuestaExito(res, 200, 'Dashboard público', { ...datos, aviso });
  } catch (error) {
    console.error('error dashboardPublico:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};
