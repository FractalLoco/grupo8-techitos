'use strict';
import { ReporteService, ReporteServiceError } from '../services/reporte.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

export const validarDatosEmergencia = async (req, res) => {
  try {
    const validacion = await ReporteService.validarEmergencia(req.params.emergenciaId);
    return respuestaExito(res, 200, 'Validacion de reporte completada', validacion);
  } catch (error) {
    if (error instanceof ReporteServiceError) {
      return respuestaError(res, error.statusCode, error.message, error.datos);
    }

    console.error('error validarDatosEmergencia:', error.message);
    return respuestaError(res, 500, 'No se pudo validar la informacion del reporte');
  }
};

export const generarReporteEmergencia = async (req, res) => {
  try {
    const confirmar = req.body?.confirmar_con_advertencias === true;
    const reporte = await ReporteService.generarReporte(
      req.params.emergenciaId,
      req.usuario.id,
      confirmar,
    );
    return respuestaExito(res, 201, 'Reporte PDF generado correctamente', { reporte });
  } catch (error) {
    if (error instanceof ReporteServiceError) {
      return respuestaError(res, error.statusCode, error.message, error.datos);
    }

    console.error('error generarReporteEmergencia:', error.message);
    return respuestaError(res, 500, 'No se pudo generar el reporte PDF');
  }
};

const responderErrorReporte = (res, error, contexto) => {
  if (error instanceof ReporteServiceError) {
    return respuestaError(res, error.statusCode, error.message, error.datos);
  }
  console.error(contexto, error.message);
  return respuestaError(res, 500, 'Error interno al consultar reportes');
};

export const listarReportes = async (req, res) => {
  try {
    const reportes = await ReporteService.listarReportes(req.query.emergencia_id);
    return respuestaExito(res, 200, 'Reportes obtenidos', { reportes });
  } catch (error) {
    return responderErrorReporte(res, error, 'error listarReportes:');
  }
};

export const obtenerDetalleReporte = async (req, res) => {
  try {
    const reporte = await ReporteService.obtenerDetalleReporte(req.params.id);
    return respuestaExito(res, 200, 'Detalle de reporte obtenido', { reporte });
  } catch (error) {
    return responderErrorReporte(res, error, 'error obtenerDetalleReporte:');
  }
};

export const descargarReporte = async (req, res) => {
  try {
    const archivo = await ReporteService.obtenerArchivoReporte(req.params.id);
    return res.download(archivo.ruta, archivo.nombreArchivo, (error) => {
      if (error && !res.headersSent) {
        console.error('error descargarReporte:', error.message);
        respuestaError(res, 500, 'No se pudo descargar el reporte');
      }
    });
  } catch (error) {
    return responderErrorReporte(res, error, 'error descargarReporte:');
  }
};
