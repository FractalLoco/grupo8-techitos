'use strict';
import { Router } from 'express';
import {
  descargarReporte,
  generarReporteEmergencia,
  listarReportes,
  obtenerDetalleReporte,
  validarDatosEmergencia,
} from '../controllers/reporte.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

router.get(
  '/emergencia/:emergenciaId/validacion',
  authMiddleware,
  roleMiddleware('coordinador'),
  validarDatosEmergencia,
);

router.post(
  '/emergencia/:emergenciaId',
  authMiddleware,
  roleMiddleware('coordinador'),
  generarReporteEmergencia,
);

router.get('/', authMiddleware, roleMiddleware('coordinador'), listarReportes);
router.get('/:id/descargar', authMiddleware, roleMiddleware('coordinador'), descargarReporte);
router.get('/:id', authMiddleware, roleMiddleware('coordinador'), obtenerDetalleReporte);

export default router;
