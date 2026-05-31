'use strict';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';
import { respuestaError } from '../utils/response.utils.js';

export const miembroMiddleware = async (req, res, next) => {
  try {
    const usuarioId = req.usuario && req.usuario.id;
    if (!usuarioId) return respuestaError(res, 401, 'No autenticado');

    const cuadrillaId = req.params && req.params.cuadrillaId
      ? parseInt(req.params.cuadrillaId, 10)
      : (req.body && req.body.cuadrilla_id ? parseInt(req.body.cuadrilla_id, 10) : null);

    req.cuadrillaId = Number.isInteger(cuadrillaId) ? cuadrillaId : null;
    req.isCoordinador = req.usuario && req.usuario.rol === 'coordinador';

    if (!req.cuadrillaId) return next();
    if (req.isCoordinador) return next();

    const existe = await MiembroCuadrillaRepository.buscarVoluntarioEnCuadrilla(usuarioId);
    if (!existe) return respuestaError(res, 403, 'No perteneces a esa cuadrilla');

    next();
  } catch (error) {
    console.error('error miembroMiddleware:', error.message);
    return respuestaError(res, 500, 'Error interno');
  }
};
