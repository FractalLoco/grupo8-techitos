'use strict';
import { Router } from 'express';
import {
  crearSolicitud,
  listarTodas,
  listarMias,
  listarPorEmergencia,
  listarPorCuadrilla,
  actualizarEstadoSolicitud,
} from '../controllers/solicitud.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

// POST /api/solicitudes — jefe o coordinador crean solicitud de herramientas/EPP
router.post('/', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla'), crearSolicitud);

// GET /api/solicitudes — coordinador ve todas (para la página de solicitudes)
router.get('/', authMiddleware, roleMiddleware('coordinador'), listarTodas);

// GET /api/solicitudes/mis — jefe o coordinador ven sus propias solicitudes creadas
router.get('/mis', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla'), listarMias);

// GET /api/solicitudes/emergencia/:emergenciaId — filtradas por emergencia
router.get('/emergencia/:emergenciaId', authMiddleware, listarPorEmergencia);

// GET /api/solicitudes/cuadrilla/:cuadrillaId — filtradas por cuadrilla
router.get('/cuadrilla/:cuadrillaId', authMiddleware, listarPorCuadrilla);

// PUT /api/solicitudes/:id/estado — coordinador aprueba o rechaza
router.put('/:id/estado', authMiddleware, roleMiddleware('coordinador'), actualizarEstadoSolicitud);

export default router;
