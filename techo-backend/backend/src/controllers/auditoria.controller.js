'use strict';
import { AuditoriaService } from '../services/auditoria.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

export const listarAuditorias = async (req, res) => {
  try {
    const resultado = await AuditoriaService.listar({
      modulo: req.query.modulo,
      accion: req.query.accion,
      busqueda: req.query.busqueda,
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      pagina: req.query.pagina,
      limite: req.query.limite,
    });

    return respuestaExito(res, 200, 'Historial de auditorías obtenido correctamente', resultado);
  } catch (error) {
    console.error('Error al listar auditorías:', error.message);
    return respuestaError(res, 500, 'No se pudo obtener el historial de auditorías');
  }
};
