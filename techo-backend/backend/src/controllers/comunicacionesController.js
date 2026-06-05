const chatModel = require('../../models/chatModel');
const usuarioModel = require('../../models/usuarioModel');

// enviar mensaje (puede ser broadcast si cuadrilla_id es null, solo coordinador)
const enviarMensaje = async (req, res) => {
  try {
    const remitente_id = req.usuario.id;
    const body = req.body || {};

    const cuadrilla_id = body.cuadrilla_id ? parseInt(body.cuadrilla_id, 10) : null;

    const { tipo = 'texto', contenido = null, archivo_url = null, prioridad = false } = body;

    // si es chat privado, verificar que remitente sea miembro de la cuadrilla (jefe o voluntario)
    if (cuadrilla_id) {
      const isCoordinador = req.isCoordinador === true;
      if (!isCoordinador) {
        const esta = await chatModel.usuarioEnCuadrilla(remitente_id, parseInt(cuadrilla_id, 10));
        if (!esta) {
          return res.status(403).json({ estado: 'error', codigo: 403, mensaje: 'No perteneces a esa cuadrilla' });
        }
      }
    }

    const mensaje = await chatModel.enviarMensaje({ cuadrilla_id, remitente_id, tipo, contenido, archivo_url, prioridad });

    
    return res.status(201).json({ estado: 'exitoso', codigo: 201, datos: { mensaje } });
  } catch (error) {
    console.error('error enviarMensaje:', error.message);
    return res.status(500).json({ estado: 'error', codigo: 500, mensaje: 'Error interno' });
  }
};

const listarMensajesCuadrilla = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const cuadrilla_id = parseInt(req.params.cuadrillaId, 10);

    // verificar pertenencia
    const esta = await chatModel.usuarioEnCuadrilla(usuario_id, cuadrilla_id);
    if (!esta) {
      return res.status(403).json({ estado: 'error', codigo: 403, mensaje: 'No tienes permiso para ver este chat' });
    }

    const mensajes = await chatModel.listarMensajesPorCuadrilla(cuadrilla_id);
    return res.status(200).json({ estado: 'exitoso', codigo: 200, datos: { mensajes } });
  } catch (error) {
    console.error('error listarMensajesCuadrilla:', error.message);
    return res.status(500).json({ estado: 'error', codigo: 500, mensaje: 'Error interno' });
  }
};

const listarBroadcast = async (req, res) => {
  try {
    const mensajes = await chatModel.listarMensajesBroadcast();
    return res.status(200).json({ estado: 'exitoso', codigo: 200, datos: { mensajes } });
  } catch (error) {
    console.error('error listarBroadcast:', error.message);
    return res.status(500).json({ estado: 'error', codigo: 500, mensaje: 'Error interno' });
  }
};

// dashboard público: contador simple
const dashboardPublico = async (req, res) => {
  try {
    const db = require('../config/baseDatos');
    const r = await db.query("SELECT COUNT(*)::int AS count FROM mensajes WHERE tipo = 'finalizado'");
    const casasFinalizadas = r.rows[0] ? r.rows[0].count : 0;

    // contar voluntarios asignados a cuadrillas activas
    const voluntarios = await db.query(
      `SELECT COUNT(DISTINCT cm.usuario_id)::int AS count
       FROM cuadrilla_miembros cm
       JOIN usuarios u ON u.id = cm.usuario_id
       JOIN cuadrillas c ON c.id = cm.cuadrilla_id
       WHERE u.rol = 'voluntario' AND c.activo = true`
    );
    const cuadrillasAct = await db.query("SELECT COUNT(*)::int as count FROM cuadrillas WHERE activo = true");

    const datos = {
      casas_finalizadas: casasFinalizadas || 0,
      voluntarios_desplegados: (voluntarios.rows[0] && voluntarios.rows[0].count) || 0,
      cuadrillas_activas: (cuadrillasAct.rows[0] && cuadrillasAct.rows[0].count) || 0,
    };

    // comprobar si hay datos recientes (mensaje en últimas 24h)
    const reciente = await require('../config/baseDatos').query(`SELECT 1 FROM mensajes WHERE creado_en > NOW() - INTERVAL '24 hours' LIMIT 1`);
    const aviso = reciente.rowCount === 0 ? 'Los datos pueden no estar actualizados' : null;

    return res.status(200).json({ estado: 'exitoso', codigo: 200, datos: { ...datos, aviso } });
  } catch (error) {
    console.error('error dashboardPublico:', error.message);
    return res.status(500).json({ estado: 'error', codigo: 500, mensaje: 'Error interno' });
  }
};


module.exports = {
  enviarMensaje,
  listarMensajesCuadrilla,
  listarBroadcast,
  dashboardPublico,

};
