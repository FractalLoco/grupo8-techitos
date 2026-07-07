'use strict';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { listarAuditorias } from '../controllers/auditoria.controller.js';

const router = Router();

router.use(authMiddleware, roleMiddleware('coordinador'));
router.get('/', listarAuditorias);

export default router;
