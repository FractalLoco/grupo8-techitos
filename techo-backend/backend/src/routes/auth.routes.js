'use strict';
import { Router } from 'express';
import { iniciarSesion, verificarSesion, registrarUsuario } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validarInicioSesion } from '../validations/auth.validation.js';

const router = Router();

/**
 * POST /api/auth/iniciar-sesion
 * Iniciar sesión con RUT y contraseña
 * Body: { rut, contrasena }
 */
router.post('/iniciar-sesion', validarInicioSesion, iniciarSesion);

/**
 * POST /api/auth/registro
 * Registrar un nuevo usuario (requiere autenticación de coordinador)
 * Body: { nombre, rut, correo, contrasena, rol }
 */
router.post('/registro', registrarUsuario);

/**
 * GET /api/auth/verificar
 * Verificar token de sesión activo
 */
router.get('/verificar', authMiddleware, verificarSesion);

export default router;
