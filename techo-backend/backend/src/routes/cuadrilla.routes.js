'use strict';
import { Router } from 'express';
import {
  crearCuadrilla,
  agregarMiembro,
  eliminarMiembro,
  asignarObra,
  actualizarFase,
  enviarAlertaEmergencia,
  completarCuadrilla,
  devolverHerramientas,
  reasignarVoluntario,
  obtenerCuadrillasConEstado,
  obtenerTodasCuadrillasConEstado,
  obtenerBalanceHerramientas,
  cerrarBalanceDia,
  listarPorEmergencia,
} from '../controllers/cuadrilla.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

/**
 * GET /api/cuadrillas/todas/estado
 * Obtener todas las cuadrillas del sistema con color de estado (vista global, sin filtrar por emergencia)
 */
router.get('/todas/estado', authMiddleware, obtenerTodasCuadrillasConEstado);

/**
 * GET /api/cuadrillas/emergencia/:emergenciaId
 * Listar cuadrillas por emergencia
 */
router.get('/emergencia/:emergenciaId', authMiddleware, listarPorEmergencia);

/**
 * GET /api/cuadrillas/emergencia/:emergenciaId/estado
 * Obtener cuadrillas con código de color de estado
 */
router.get('/emergencia/:emergenciaId/estado', authMiddleware, obtenerCuadrillasConEstado);

/**
 * POST /api/cuadrillas
 * Crear nueva cuadrilla (solo coordinador)
 * Body: { nombre, jefe_id, emergencia_id, plazo_dias? }
 */
router.post('/', authMiddleware, roleMiddleware('coordinador'), crearCuadrilla);

/**
 * POST /api/cuadrillas/:cuadrillaId/miembros
 * Agregar miembro a cuadrilla (solo coordinador)
 * Body: { voluntarioId, habilidades? }
 */
router.post('/:cuadrillaId/miembros', authMiddleware, roleMiddleware('coordinador'), agregarMiembro);

/**
 * DELETE /api/cuadrillas/:cuadrillaId/miembros/:voluntarioId
 * Eliminar miembro de cuadrilla (solo coordinador)
 */
router.delete('/:cuadrillaId/miembros/:voluntarioId', authMiddleware, roleMiddleware('coordinador'), eliminarMiembro);

/**
 * PUT /api/cuadrillas/:cuadrillaId/obra
 * Asignar obra a cuadrilla (solo coordinador)
 * Body: { obraId }
 */
router.put('/:cuadrillaId/obra', authMiddleware, roleMiddleware('coordinador'), asignarObra);

/**
 * PUT /api/cuadrillas/:cuadrillaId/fase
 * Actualizar fase de avance (jefe de la cuadrilla o coordinador)
 * Body: { fase }
 */
router.put('/:cuadrillaId/fase', authMiddleware, roleMiddleware('jefe_cuadrilla', 'coordinador'), actualizarFase);

/**
 * POST /api/cuadrillas/:cuadrillaId/alerta
 * Enviar alerta de emergencia (solo jefe_cuadrilla)
 * Body: { descripcion }
 */
router.post('/:cuadrillaId/alerta', authMiddleware, roleMiddleware('jefe_cuadrilla'), enviarAlertaEmergencia);

/**
 * PUT /api/cuadrillas/:cuadrillaId/completar
 * Marcar cuadrilla como completada (solo coordinador)
 */
router.put('/:cuadrillaId/completar', authMiddleware, roleMiddleware('coordinador'), completarCuadrilla);

/**
 * PUT /api/cuadrillas/:cuadrillaId/devolver-herramientas
 * Devolver al inventario las herramientas reutilizables de una obra terminada (solo coordinador)
 */
router.put('/:cuadrillaId/devolver-herramientas', authMiddleware, roleMiddleware('coordinador'), devolverHerramientas);

/**
 * PUT /api/cuadrillas/reasignar/:cuadrillaOrigenId/:voluntarioId
 * Reasignar voluntario a otra cuadrilla (solo coordinador)
 * Body: { cuadrillaDestinoId }
 */
router.put('/reasignar/:cuadrillaOrigenId/:voluntarioId', authMiddleware, roleMiddleware('coordinador'), reasignarVoluntario);

/**
 * GET /api/cuadrillas/:cuadrillaId/herramientas/balance
 * Consultar balance de herramientas sin efecto secundario
 */
router.get('/:cuadrillaId/herramientas/balance', authMiddleware, obtenerBalanceHerramientas);

/**
 * POST /api/cuadrillas/:cuadrillaId/herramientas/cierre
 * Cerrar el balance del día: activa alerta en el mapa si hay diferencias y notifica al coordinador
 * Solo coordinador o jefe_cuadrilla
 */
router.post('/:cuadrillaId/herramientas/cierre', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla'), cerrarBalanceDia);

export default router;
