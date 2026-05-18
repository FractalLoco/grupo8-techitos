'use strict';
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,
  activarUsuario,
} from '../controllers/usuario.controller.js';

const router = Router();

router.use(authMiddleware, roleMiddleware('coordinador'));

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.patch('/:id/desactivar', desactivarUsuario);
router.patch('/:id/activar', activarUsuario);

export default router;
