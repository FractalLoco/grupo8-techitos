'use strict';
import { Router } from 'express';
import {
  crearZona,
  listarZonasPorEmergencia,
  actualizarZona,
  eliminarZona,
} from '../controllers/zona-peligro.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

/**
 * POST /api/zonas-peligro
 * Crear zona amarilla o roja (solo coordinador)
 * Body: { emergencia_id, tipo, lat, lng, radio, descripcion?, comentarios? }
 */
router.post('/', authMiddleware, roleMiddleware('coordinador'), crearZona);

/**
 * GET /api/zonas-peligro/emergencia/:emergenciaId
 * Listar todas las zonas de peligro de una emergencia (cualquier usuario autenticado)
 */
router.get('/emergencia/:emergenciaId', authMiddleware, listarZonasPorEmergencia);

/**
 * PUT /api/zonas-peligro/:zonaId
 * Editar radio, tipo, descripcion o comentarios (solo coordinador)
 * Body: { tipo?, lat?, lng?, radio?, descripcion?, comentarios? }
 */
router.put('/:zonaId', authMiddleware, roleMiddleware('coordinador'), actualizarZona);

/**
 * DELETE /api/zonas-peligro/:zonaId
 * Eliminar zona del mapa (solo coordinador)
 */
router.delete('/:zonaId', authMiddleware, roleMiddleware('coordinador'), eliminarZona);

export default router;
