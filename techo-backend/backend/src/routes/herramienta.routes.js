'use strict';
import { Router } from 'express';
import {
  registrarHerramienta,
  registrarHerramientasMasivas,
  listarHerramientas,
  actualizarEstadoHerramienta,
  resumenPorEmergencia,
  inventarioTotal,
} from '../controllers/herramienta.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

/**
 * GET /api/herramientas/emergencia/:emergenciaId
 * Resumen de inventario agrupado por cuadrilla para toda la emergencia.
 * Debe ir ANTES de /:cuadrillaId para que Express no interprete "emergencia" como un ID numérico.
 */
router.get('/inventario', authMiddleware, inventarioTotal);
router.get('/emergencia/:emergenciaId', authMiddleware, resumenPorEmergencia);

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
