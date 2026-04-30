'use strict';
import { Router } from 'express';
import {
  crearEmergencia,
  listarActivas,
  listarTodas,
  obtenerDetalle,
  finalizarEmergencia,
  registrarFamilia,
  listarFamilias,
  registrarEvaluacion,
  listarEvaluaciones,
} from '../controllers/emergencia.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

/**
 * GET /api/emergencias
 * Listo todas las emergencias sin filtro de estado
 */
router.get('/', authMiddleware, listarTodas);

/**
 * GET /api/emergencias/activas
 * Listo solo las emergencias en estado 'activa'
 */
router.get('/activas', authMiddleware, listarActivas);

/**
 * GET /api/emergencias/:id
 * Obtengo el detalle completo de una emergencia por su ID
 */
router.get('/:id', authMiddleware, obtenerDetalle);

/**
 * POST /api/emergencias
 * Creo una nueva emergencia (solo coordinador)
 * Body: { nombre, descripcion?, lat?, lng? }
 */
router.post('/', authMiddleware, roleMiddleware('coordinador'), crearEmergencia);

/**
 * PUT /api/emergencias/:id/finalizar
 * Cierro la emergencia registrando la fecha de fin (solo coordinador)
 */
router.put('/:id/finalizar', authMiddleware, roleMiddleware('coordinador'), finalizarEmergencia);

/**
 * POST /api/emergencias/:emergenciaId/familias
 * Registro una familia afectada en la emergencia (solo coordinador)
 * Body: { nombre_cabeza_familia, direccion?, lat?, lng?, miembros?, prioridad? }
 */
router.post('/:emergenciaId/familias', authMiddleware, roleMiddleware('coordinador'), registrarFamilia);

/**
 * GET /api/emergencias/:emergenciaId/familias
 * Listo todas las familias registradas bajo una emergencia
 */
router.get('/:emergenciaId/familias', authMiddleware, listarFamilias);

/**
 * POST /api/emergencias/:emergenciaId/familias/:familiaId/evaluaciones
 * Registro una evaluación de diagnóstico para una familia específica (solo coordinador)
 * Body: { estado?, observaciones? }
 */
router.post('/:emergenciaId/familias/:familiaId/evaluaciones', authMiddleware, roleMiddleware('coordinador'), registrarEvaluacion);

/**
 * GET /api/emergencias/:emergenciaId/evaluaciones
 * Listo todas las evaluaciones realizadas en el marco de una emergencia
 */
router.get('/:emergenciaId/evaluaciones', authMiddleware, listarEvaluaciones);

export default router;
