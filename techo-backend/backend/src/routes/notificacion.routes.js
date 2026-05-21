'use strict';
import { Router } from 'express';
import {
  listarNotificaciones,
  contarNoLeidas,
  marcarLeida,
  marcarTodasLeidas,
} from '../controllers/notificacion.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/notificaciones
 * Listar notificaciones del usuario autenticado
 */
router.get('/', authMiddleware, listarNotificaciones);

/**
 * GET /api/notificaciones/no-leidas
 * Contar notificaciones no leídas (badge de campana)
 */
router.get('/no-leidas', authMiddleware, contarNoLeidas);

/**
 * PATCH /api/notificaciones/:id/leer
 * Marcar una notificación como leída
 */
router.patch('/:id/leer', authMiddleware, marcarLeida);

/**
 * PATCH /api/notificaciones/leer-todas
 * Marcar todas las notificaciones como leídas
 */
router.patch('/leer-todas', authMiddleware, marcarTodasLeidas);

export default router;
