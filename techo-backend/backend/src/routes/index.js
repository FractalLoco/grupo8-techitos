'use strict';
// Importo el enrutador de Express y cada módulo de rutas del sistema
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import cuadrillaRoutes from './cuadrilla.routes.js';
import emergenciaRoutes from './emergencia.routes.js';
import herramientaRoutes from './herramienta.routes.js';

const router = Router();

// Registro cada grupo de rutas bajo su prefijo correspondiente
// Todas se montan bajo /api desde el index.js principal
router.use('/auth', authRoutes);
router.use('/cuadrillas', cuadrillaRoutes);
router.use('/emergencias', emergenciaRoutes);
router.use('/herramientas', herramientaRoutes);

export default router;
