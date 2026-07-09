'use strict';
import { Router } from 'express';
import {
  crearObra,
  listarObrasPorEmergencia,
  listarTodasObras,
  obtenerObra,
  actualizarEstadoObra,
} from '../controllers/obra.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

/**
 * POST /api/obras
 * Registrar una nueva obra con coordenadas (solo coordinador)
 * Body: { nombre, descripcion?, direccion?, lat?, lng?, emergencia_id, familia_id? }
 */
router.post('/', authMiddleware, roleMiddleware('coordinador'), crearObra);

/**
 * GET /api/obras/todas
 * Listar todas las obras del sistema (vista global del mapa, sin filtrar por emergencia)
 */
router.get('/todas', authMiddleware, listarTodasObras);

/**
 * GET /api/obras/emergencia/:emergenciaId
 * Listar todas las obras de una emergencia (puntos del mapa)
 */
router.get('/emergencia/:emergenciaId', authMiddleware, listarObrasPorEmergencia);

/**
 * GET /api/obras/:id
 * Detalle de una obra con sus coordenadas exactas
 */
router.get('/:id', authMiddleware, obtenerObra);

/**
 * PATCH /api/obras/:id/estado
 * Actualizar estado de una obra (solo coordinador)
 * Body: { estado }
 */
router.patch('/:id/estado', authMiddleware, roleMiddleware('coordinador'), actualizarEstadoObra);

export default router;
