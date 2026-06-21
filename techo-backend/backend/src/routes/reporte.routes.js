'use strict';
import { Router } from 'express';
import { generarReporteEmergencia, validarDatosEmergencia } from '../controllers/reporte.controller.js';
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

export default router;
