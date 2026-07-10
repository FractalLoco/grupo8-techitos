'use strict';
import { Router } from 'express';
import {
  crearSolicitud,
  listarTodas,
  listarMias,
  listarPorAprobar,
  listarPorEmergencia,
  listarPorCuadrilla,
  actualizarEstadoSolicitud,
} from '../controllers/solicitud.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

// POST /api/solicitudes — la cuadrilla (voluntario o jefe) crea solicitudes; el coordinador también puede
router.post('/', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla', 'voluntario'), crearSolicitud);

// GET /api/solicitudes — coordinador ve todas (para la página de solicitudes)
router.get('/', authMiddleware, roleMiddleware('coordinador'), listarTodas);

// GET /api/solicitudes/mis — cualquier usuario ve las solicitudes que él creó
router.get('/mis', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla', 'voluntario'), listarMias);

// GET /api/solicitudes/por-aprobar — coordinador (todas) o jefe (las de sus cuadrillas)
router.get('/por-aprobar', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla'), listarPorAprobar);

// GET /api/solicitudes/emergencia/:emergenciaId — filtradas por emergencia
router.get('/emergencia/:emergenciaId', authMiddleware, listarPorEmergencia);

// GET /api/solicitudes/cuadrilla/:cuadrillaId — filtradas por cuadrilla
router.get('/cuadrilla/:cuadrillaId', authMiddleware, listarPorCuadrilla);

// PUT /api/solicitudes/:id/estado — solo el coordinador aprueba/rechaza según el stock del inventario
router.put('/:id/estado', authMiddleware, roleMiddleware('coordinador'), actualizarEstadoSolicitud);

export default router;
