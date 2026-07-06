'use strict';
import { CuadrillaService } from '../services/cuadrilla.service.js';
import { HerramientaService } from '../services/herramienta.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// Creo una nueva cuadrilla validando que exista una emergencia activa y que el jefe tenga el rol correcto.
export const crearCuadrilla = async (solicitud, respuesta) => {
  try {
    const cuadrilla = await CuadrillaService.crearCuadrilla(solicitud.body);
    return respuestaExito(respuesta, 201, 'Cuadrilla creada correctamente', { cuadrilla });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Agrego un voluntario a una cuadrilla verificando que no supere el límite de 11 integrantes.
export const agregarMiembro = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const { voluntarioId, habilidades } = solicitud.body;
    const miembro = await CuadrillaService.agregarMiembro(cuadrillaId, voluntarioId, habilidades);
    return respuestaExito(respuesta, 201, 'Miembro agregado correctamente', { miembro });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Elimino un voluntario de la cuadrilla asegurando que queden al menos 10 integrantes.
export const eliminarMiembro = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId, voluntarioId } = solicitud.params;
    await CuadrillaService.eliminarMiembro(cuadrillaId, voluntarioId);
    return respuestaExito(respuesta, 200, 'Miembro eliminado de la cuadrilla');
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Asigno una obra específica a la cuadrilla y registro la fecha de asignación para medir el plazo.
export const asignarObra = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const { obraId } = solicitud.body;
    const cuadrilla = await CuadrillaService.asignarObra(cuadrillaId, obraId);
    return respuestaExito(respuesta, 200, 'Obra asignada correctamente', { cuadrilla });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Actualizo la fase de avance de la cuadrilla; solo el jefe puede hacer este cambio.
export const actualizarFase = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const { fase } = solicitud.body;
    const cuadrilla = await CuadrillaService.actualizarFase(cuadrillaId, fase, solicitud.usuario.id);
    return respuestaExito(respuesta, 200, 'Fase actualizada correctamente', { cuadrilla });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// El jefe activa una alerta de emergencia con una descripción de lo que está ocurriendo en terreno.
export const enviarAlertaEmergencia = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const { descripcion } = solicitud.body;
    const cuadrilla = await CuadrillaService.enviarAlertaEmergencia(cuadrillaId, descripcion, solicitud.usuario.id);
    return respuestaExito(respuesta, 200, 'Alerta de emergencia enviada', { cuadrilla });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Marco la cuadrilla como completada y elimino a todos sus miembros para liberar a los voluntarios.
export const completarCuadrilla = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const cuadrilla = await CuadrillaService.completarCuadrilla(cuadrillaId);
    return respuestaExito(respuesta, 200, 'Cuadrilla completada y desarmada', { cuadrilla });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Muevo un voluntario de una cuadrilla a otra en una sola operación atómica.
export const reasignarVoluntario = async (solicitud, respuesta) => {
  try {
    const { cuadrillaOrigenId, voluntarioId } = solicitud.params;
    const { cuadrillaDestinoId } = solicitud.body;
    await CuadrillaService.reasignarVoluntario(cuadrillaOrigenId, cuadrillaDestinoId, voluntarioId);
    return respuestaExito(respuesta, 200, 'Voluntario reasignado correctamente');
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Devuelvo todas las cuadrillas del sistema con su color de estado (vista global sin filtrar por emergencia).
// Acepta ?color=verde|amarillo|rojo|gris para filtrar.
export const obtenerTodasCuadrillasConEstado = async (solicitud, respuesta) => {
  try {
    const { color } = solicitud.query;
    const cuadrillas = await CuadrillaService.obtenerTodasConEstado(color || null);
    return respuestaExito(respuesta, 200, 'Cuadrillas obtenidas', { cuadrillas });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Devuelvo las cuadrillas de una emergencia con su color de estado (verde/amarillo/rojo/gris).
// Acepta ?color=verde|amarillo|rojo|gris para filtrar por prioridad desde el mapa del coordinador.
export const obtenerCuadrillasConEstado = async (solicitud, respuesta) => {
  try {
    const { emergenciaId } = solicitud.params;
    const { color } = solicitud.query;
    const cuadrillas = await CuadrillaService.obtenerCuadrillasConEstado(emergenciaId, color || null);
    return respuestaExito(respuesta, 200, 'Cuadrillas obtenidas', { cuadrillas });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Genero el balance de herramientas de una cuadrilla: cuántas están buenas, dañadas, perdidas, etc.
export const obtenerBalanceHerramientas = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const balance = await CuadrillaService.obtenerBalanceHerramientas(cuadrillaId);
    return respuestaExito(respuesta, 200, 'Balance de herramientas', { balance });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};

// Cierro el balance del día: si hay diferencias activo la alerta en el punto del mapa y notifico al coordinador.
export const cerrarBalanceDia = async (solicitud, respuesta) => {
  try {
    const { cuadrillaId } = solicitud.params;
    const balance = await HerramientaService.cerrarBalance(parseInt(cuadrillaId));
    return respuestaExito(respuesta, 200, 'Balance del día cerrado', { balance });
  } catch (error) {
    return respuestaError(respuesta, 400, error.message);
  }
};

// Listo todas las cuadrillas que pertenecen a una emergencia específica.
export const listarPorEmergencia = async (solicitud, respuesta) => {
  try {
    const { emergenciaId } = solicitud.params;
    const cuadrillas = await CuadrillaService.listarPorEmergencia(emergenciaId);
    return respuestaExito(respuesta, 200, 'Cuadrillas obtenidas', { cuadrillas });
  } catch (error) {
    return respuestaError(respuesta, 500, error.message);
  }
};
