'use strict';
import { Router } from 'express';
import {
  crearSolicitud,
  listarPorEmergencia,
  listarPorCuadrilla,
  actualizarEstadoSolicitud,
} from '../controllers/solicitud.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('jefe_cuadrilla'), crearSolicitud);
router.get('/emergencia/:emergenciaId', authMiddleware, listarPorEmergencia);
router.get('/cuadrilla/:cuadrillaId', authMiddleware, listarPorCuadrilla);
router.put('/:id/estado', authMiddleware, roleMiddleware('coordinador'), actualizarEstadoSolicitud);

export default router;
