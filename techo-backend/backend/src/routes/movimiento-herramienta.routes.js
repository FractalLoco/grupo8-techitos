'use strict';
import { Router } from 'express';
import {
  registrarSalida,
  registrarStock,
  listarMovimientos,
  listarPorCuadrilla,
  registrarEntrada,
  consultarStock,
} from '../controllers/movimiento-herramienta.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';

const router = Router();

// POST /api/movimientos — registrar salida manual (coordinador)
router.post('/', authMiddleware, roleMiddleware('coordinador'), registrarSalida);

// POST /api/movimientos/stock — registrar entrada de stock al almacén (coordinador)
router.post('/stock', authMiddleware, roleMiddleware('coordinador'), registrarStock);

// GET /api/movimientos?emergenciaId=X — listar movimientos filtrados o todos
router.get('/', authMiddleware, listarMovimientos);

// GET /api/movimientos/cuadrilla/:cuadrillaId — movimientos de una cuadrilla
router.get('/cuadrilla/:cuadrillaId', authMiddleware, listarPorCuadrilla);

// GET /api/movimientos/stock?nombre_item=X&tipo_item=Y — consultar disponibilidad
router.get('/stock', authMiddleware, roleMiddleware('coordinador'), consultarStock);

// PUT /api/movimientos/:id/entrada — marcar devolución (coordinador)
router.put('/:id/entrada', authMiddleware, roleMiddleware('coordinador'), registrarEntrada);

export default router;
