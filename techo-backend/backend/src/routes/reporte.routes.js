'use strict';
import { Router } from 'express';
import { validarDatosEmergencia } from '../controllers/reporte.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

router.get(
  '/emergencia/:emergenciaId/validacion',
  authMiddleware,
  roleMiddleware('coordinador'),
  validarDatosEmergencia,
);

export default router;
