'use strict';
import { Router } from 'express';
import { enviarArchivoChat, enviarChatCoordinadores, enviarChatJefes, enviarFotoCanalCoordinador, enviarFotoCuadrilla, enviarMensaje, listarChatCoordinadores, listarChatJefes, listarMensajesCuadrilla, listarBroadcast, listarCuadrillasAccesibles, listarIntegrantesCuadrilla } from '../controllers/mensaje.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { respuestaError } from '../utils/response.utils.js';
import { procesarFotoChat } from '../middleware/foto-chat.middleware.js';
import { procesarArchivoChat } from '../middleware/archivo-chat.middleware.js';

const router = Router();

router.post('/chat/enviar', authMiddleware, enviarMensaje);
router.post('/chat/archivo', authMiddleware, procesarArchivoChat, enviarArchivoChat);
router.get('/chat/cuadrilla/:cuadrillaId', authMiddleware, listarMensajesCuadrilla);
router.get('/chat/broadcast', authMiddleware, listarBroadcast);
router.get('/chat/coordinadores', authMiddleware, roleMiddleware('coordinador'), listarChatCoordinadores);
router.post('/chat/coordinadores', authMiddleware, roleMiddleware('coordinador'), enviarChatCoordinadores);
router.post(
  '/chat/:canal/foto',
  authMiddleware,
  roleMiddleware('coordinador', 'jefe_cuadrilla'),
  procesarFotoChat,
  enviarFotoCanalCoordinador,
);
router.get('/chat/jefes', authMiddleware, roleMiddleware('coordinador', 'jefe_cuadrilla'), listarChatJefes);
router.post('/chat/jefes', authMiddleware, roleMiddleware('jefe_cuadrilla'), enviarChatJefes);
router.get('/cuadrillas', authMiddleware, listarCuadrillasAccesibles);
router.get('/cuadrillas/:cuadrillaId/integrantes', authMiddleware, listarIntegrantesCuadrilla);
router.post(
  '/chat/cuadrilla/:cuadrillaId/foto',
  authMiddleware,
  procesarFotoChat,
  enviarFotoCuadrilla,
);

router.post('/chat/emergencia', authMiddleware, roleMiddleware('jefe_cuadrilla'), async (req, res) => {
  req.body = req.body || {};
  req.body.tipo = 'emergencia';
  req.body.prioridad = true;
  return enviarMensaje(req, res);
});

router.post('/cuadrilla/:cuadrillaId/marcar-avance', authMiddleware, roleMiddleware('jefe_cuadrilla'), async (req, res) => {
  const permitido = ['avance', 'finalizado'];
  const hito = req.body && req.body.hito ? String(req.body.hito).toLowerCase() : 'avance';
  if (!permitido.includes(hito)) return respuestaError(res, 400, `Hito inválido. Valores permitidos: ${permitido.join(', ')}`);
  req.body.tipo = hito;
  req.body.cuadrilla_id = parseInt(req.params.cuadrillaId, 10);
  return enviarMensaje(req, res);
});

export default router;
