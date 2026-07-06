'use strict';
import { MovimientoHerramientaService } from '../services/movimiento-herramienta.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

export const registrarSalida = async (solicitud, respuesta) => {
  try {
    const movimiento = await MovimientoHerramientaService.registrarSalida(solicitud.body, solicitud.usuario.id);
    return respuestaExito(respuesta, 201, 'Salida registrada', { movimiento });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

export const registrarStock = async (solicitud, respuesta) => {
  try {
    const movimiento = await MovimientoHerramientaService.registrarStockEntrada(solicitud.body, solicitud.usuario.id);
    return respuestaExito(respuesta, 201, 'Stock registrado en el inventario', { movimiento });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

export const listarMovimientos = async (solicitud, respuesta) => {
  try {
    const { emergenciaId } = solicitud.query;
    const movimientos = emergenciaId
      ? await MovimientoHerramientaService.listarPorEmergencia(Number(emergenciaId))
      : await MovimientoHerramientaService.listarTodos();
    return respuestaExito(respuesta, 200, 'Movimientos obtenidos', { movimientos });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

export const listarPorCuadrilla = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const movimientos = await MovimientoHerramientaService.listarPorCuadrilla(Number(cuadrillaId));
    return respuestaExito(respuesta, 200, 'Movimientos de cuadrilla obtenidos', { movimientos });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

export const registrarEntrada = async (solicitud, respuesta) => {
  try {
    const { id } = solicitud.params;
    const { observaciones } = solicitud.body;
    const movimiento = await MovimientoHerramientaService.registrarEntrada(Number(id), observaciones);
    return respuestaExito(respuesta, 200, 'Entrada registrada — ítem marcado como devuelto', { movimiento });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

export const consultarStock = async (solicitud, respuesta) => {
  try {
    const { nombre_item, tipo_item } = solicitud.query;
    if (!nombre_item) return respuestaError(respuesta, 400, 'nombre_item es requerido');
    const disponible = await MovimientoHerramientaService.stockDisponible(nombre_item, tipo_item || 'herramienta');
    return respuestaExito(respuesta, 200, 'Stock consultado', { disponible });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};
