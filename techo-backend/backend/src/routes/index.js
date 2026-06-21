'use strict';
// Importo el enrutador de Express y cada módulo de rutas del sistema
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cuadrillaRoutes from './cuadrilla.routes.js';
import emergenciaRoutes from './emergencia.routes.js';
import herramientaRoutes from './herramienta.routes.js';
import usuarioRoutes from './usuario.routes.js';
import mensajeRoutes from './mensaje.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import obraRoutes from './obra.routes.js';
import notificacionRoutes from './notificacion.routes.js';
import zonaPeligroRoutes from './zona-peligro.routes.js';
import solicitudRoutes from './solicitud.routes.js';
import reporteRoutes from './reporte.routes.js';

const router = Router();

// Registro cada grupo de rutas bajo su prefijo correspondiente
// Todas se montan bajo /api desde el index.js principal
router.use('/auth', authRoutes);
router.use('/cuadrillas', cuadrillaRoutes);
router.use('/emergencias', emergenciaRoutes);
router.use('/herramientas', herramientaRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/comunicaciones', mensajeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/obras', obraRoutes);
router.use('/notificaciones', notificacionRoutes);
router.use('/zonas-peligro', zonaPeligroRoutes);
router.use('/solicitudes', solicitudRoutes);
router.use('/reportes', reporteRoutes);

export default router;
