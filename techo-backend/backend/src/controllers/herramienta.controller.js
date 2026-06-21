'use strict';
import { HerramientaService } from '../services/herramienta.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// Registro una herramienta individual asignándola a la cuadrilla indicada en la URL.
export const registrarHerramienta = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const { nombre } = solicitud.body;
    const herramienta = await HerramientaService.registrar(parseInt(cuadrillaId), nombre);
    return respuestaExito(respuesta, 201, 'Herramienta registrada correctamente', { herramienta });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Registro múltiples herramientas de una sola vez para agilizar la preparación de la cuadrilla.
// Recibo un arreglo de nombres y los persisto uno a uno.
export const registrarHerramientasMasivas = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const { nombres } = solicitud.body;
    if (!Array.isArray(nombres) || nombres.length === 0) {
      return respuestaError(respuesta, 400, 'Debes enviar un arreglo de nombres no vacío');
    }
    const herramientas = await HerramientaService.registrarHerramientasMasivas(parseInt(cuadrillaId), nombres);
    return respuestaExito(respuesta, 201, 'Herramientas registradas correctamente', { herramientas });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Listo todas las herramientas asignadas a una cuadrilla específica.
export const listarHerramientas = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const herramientas = await HerramientaService.listarPorCuadrilla(parseInt(cuadrillaId));
    return respuestaExito(respuesta, 200, 'Herramientas obtenidas', { herramientas });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Devuelvo el resumen de inventario de herramientas agrupado por cuadrilla para toda la emergencia.
// Permite al coordinador ver de un vistazo el estado global sin consultar cuadrilla por cuadrilla.
export const inventarioTotal = async (solicitud, respuesta) => {
  try {
    const datos = await HerramientaService.inventarioTotal();
    return respuestaExito(respuesta, 200, 'Inventario total obtenido', datos);
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

export const resumenPorEmergencia = async (solicitud, respuesta) => {
  try {
    const { emergenciaId } = solicitud.params;
    const datos = await HerramientaService.resumenPorEmergencia(parseInt(emergenciaId));
    return respuestaExito(respuesta, 200, 'Resumen de inventario obtenido', datos);
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Actualizo el estado de una herramienta al momento de devolverla o reportarla.
// El estado puede ser: buena, danada, perdida, no_devuelta.
export const actualizarEstadoHerramienta = async (solicitud, respuesta) => {
  try {
    const { herramientaId } = solicitud.params;
    const { estado, observaciones } = solicitud.body;
    const herramienta = await HerramientaService.actualizarEstado(parseInt(herramientaId), estado, observaciones);
    return respuestaExito(respuesta, 200, 'Estado de herramienta actualizado', { herramienta });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};
