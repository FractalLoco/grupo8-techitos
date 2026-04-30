'use strict';
import { Router } from 'express';
import {
  registrarHerramienta,
  registrarHerramientasMasivas,
  listarHerramientas,
  actualizarEstadoHerramienta,
} from '../controllers/herramienta.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

/**
 * GET /api/herramientas/:cuadrillaId
 * Listo todas las herramientas de una cuadrilla
 */
router.get('/:cuadrillaId', authMiddleware, listarHerramientas);

/**
 * POST /api/herramientas/:cuadrillaId
 * Registro una herramienta individual en la cuadrilla (solo coordinador)
 * Body: { nombre }
 */
router.post('/:cuadrillaId', authMiddleware, roleMiddleware('coordinador'), registrarHerramienta);

/**
 * POST /api/herramientas/:cuadrillaId/masivo
 * Registro múltiples herramientas en lote (solo coordinador)
 * Body: { nombres: ['martillo', 'pala', ...] }
 */
router.post('/:cuadrillaId/masivo', authMiddleware, roleMiddleware('coordinador'), registrarHerramientasMasivas);

/**
 * PUT /api/herramientas/:herramientaId/estado
 * Actualizo el estado de una herramienta (coordinador o jefe_cuadrilla)
 * Body: { estado, observaciones? }
 */
router.put('/:herramientaId/estado', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla'), actualizarEstadoHerramienta);

export default router;
