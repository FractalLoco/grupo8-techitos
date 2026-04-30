const chatModel = require('../models/chatModel');

// Middleware que verifica si el usuario es miembro de la cuadrilla indicada.
// Si no hay cuadrilla en params ni en body, deja pasar.
const verificarMiembroCuadrilla = async (req, res, next) => {
  try {
    const usuarioId = req.usuario && req.usuario.id;
    if (!usuarioId) return res.status(401).json({ estado: 'error', codigo: 401, mensaje: 'No autenticado' });

    // normalizar cuadrilla id desde params o body y exponerlo en req.cuadrillaId
    const cuadrillaId = req.params && req.params.cuadrillaId
      ? parseInt(req.params.cuadrillaId, 10)
      : (req.body && req.body.cuadrilla_id ? parseInt(req.body.cuadrilla_id, 10) : null);

    req.cuadrillaId = Number.isInteger(cuadrillaId) ? cuadrillaId : null;

    // marcar si el usuario es coordinador para decisiones posteriores
    const rol = req.usuario && req.usuario.rol;
    req.isCoordinador = rol === 'coordinador';

    // si no hay cuadrilla indicada, no aplica este middleware (ej: broadcast)
    if (!req.cuadrillaId) return next();

    // permitir acceso si es coordinador (puede escribir/ver cualquier cuadrilla)
    if (req.isCoordinador) return next();

    // para otros roles verificar pertenencia
    const esMiembro = await chatModel.usuarioEnCuadrilla(usuarioId, req.cuadrillaId);
    if (!esMiembro) {
      return res.status(403).json({ estado: 'error', codigo: 403, mensaje: 'No perteneces a esa cuadrilla' });
    }

    return next();
  } catch (error) {
    console.error('error verificarMiembroCuadrilla:', error.message);
    return res.status(500).json({ estado: 'error', codigo: 500, mensaje: 'Error interno' });
  }
};

module.exports = verificarMiembroCuadrilla;
