'use strict';
import { MensajeService } from '../services/mensaje.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

export const enviarMensaje = async (req, res) => {
  try {
    const remitente_id = req.usuario.id;
    const body = req.body || {};
    const cuadrilla_id = body.cuadrilla_id ? parseInt(body.cuadrilla_id, 10) : null;
    const { tipo = 'texto', contenido = null, archivo_url = null, prioridad = false } = body;

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

    const mensaje = await MensajeService.enviarMensaje({ cuadrilla_id, remitente_id, tipo, contenido, archivo_url, prioridad });
    return respuestaExito(res, 201, 'Mensaje enviado', { mensaje });
  } catch (error) {
    console.error('error enviarMensaje:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};

export const listarMensajesCuadrilla = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const cuadrilla_id = parseInt(req.params.cuadrillaId, 10);
    const esta = await MensajeService.usuarioEnCuadrilla(usuario_id, cuadrilla_id);
    if (!esta) return respuestaError(res, 403, 'No tienes permiso para ver este chat');
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
       WHERE u.rol = 'voluntario' AND c.activo = true`
    );
    const cuadrillasAct = await AppDataSource.query("SELECT COUNT(*)::int as count FROM cuadrillas WHERE activo = true");

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
