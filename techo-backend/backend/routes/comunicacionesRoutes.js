const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');
const comunicacionesController = require('../controllers/comunicacionesController');
const verificarMiembroCuadrilla = require('../middleware/verificarMiembroCuadrilla');

// chat
// enviar mensaje (si es privado se requiere pertenecer a la cuadrilla)
router.post('/chat/enviar', verificarToken, verificarMiembroCuadrilla, comunicacionesController.enviarMensaje);
// listar mensajes de una cuadrilla — requiere pertenencia
router.get('/chat/cuadrilla/:cuadrillaId', verificarToken, verificarMiembroCuadrilla, comunicacionesController.listarMensajesCuadrilla);
router.get('/chat/broadcast', verificarToken, comunicacionesController.listarBroadcast);
// alerta de emergencia desde jefe de cuadrilla — versión simple: validar pertenencia y delegar al controlador
router.post('/chat/emergencia', verificarToken, verificarMiembroCuadrilla, (req, res) => {
  // forzamos tipo y prioridad
  req.body = req.body || {};
  req.body.tipo = 'emergencia';
  req.body.prioridad = true;
  return comunicacionesController.enviarMensaje(req, res);
});
// marcar avance 
router.post('/cuadrilla/:cuadrillaId/marcar-avance', verificarToken, verificarRol('jefe_cuadrilla'), verificarMiembroCuadrilla, async (req, res) => {
		// aceptar hito en el body: 'avance' o 'finalizado'
		const permitido = ['avance', 'finalizado'];
		const hito = req.body && req.body.hito ? String(req.body.hito).toLowerCase() : 'avance';
		if (!permitido.includes(hito)) {
			return res.status(400).json({ estado: 'error', codigo: 400, mensaje: `Hito inválido. Valores permitidos: ${permitido.join(', ')}` });
		}

		// reusar endpoint de mensajes con tipo adecuado
		req.body.tipo = hito;
		req.body.cuadrilla_id = parseInt(req.params.cuadrillaId, 10);
		return comunicacionesController.enviarMensaje(req, res);
});

// dashboard público (no token requerido)
router.get('/dashboard/publico', comunicacionesController.dashboardPublico);



module.exports = router;
