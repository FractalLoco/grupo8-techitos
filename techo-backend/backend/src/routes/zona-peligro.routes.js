'use strict';
import { Router } from 'express';
import { crearZona, listarZonas, eliminarZona } from '../controllers/zona-peligro.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

/**
 * GET /api/zonas-peligro/emergencia/:emergenciaId
 * Devuelve las zonas de peligro de una emergencia para pintarlas en el mapa.
 * Todos los usuarios autenticados pueden verlas.
 */
router.get('/emergencia/:emergenciaId', authMiddleware, listarZonas);

/**
 * POST /api/zonas-peligro
 * El coordinador marca un punto del mapa como zona de peligro.
 * Body: { lat, lng, radio?, tipo, comentario?, emergencia_id }
 */
router.post('/', authMiddleware, roleMiddleware('coordinador'), crearZona);

/**
 * DELETE /api/zonas-peligro/:zonaId
 * El coordinador elimina una zona de peligro del mapa.
 */
router.delete('/:zonaId', authMiddleware, roleMiddleware('coordinador'), eliminarZona);

export default router;
