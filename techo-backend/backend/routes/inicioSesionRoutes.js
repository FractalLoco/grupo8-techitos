const express = require('express');
const enrutador = express.Router();
const { iniciarSesion, verificarToken } = require('../controllers/inicioSesionController');
const { validarInicioSesion } = require('../validations/inicioSesionValidation');
const verificarTokenMiddleware = require('../middleware/verificarToken');
const verificarRol = require('../middleware/verificarRol');

// las rutas solo definen el camino y llaman al controller
// la lógica vive en el controller, las validaciones en validations

// POST /auth/iniciar-sesion — pública, cualquiera puede intentar entrar
enrutador.post('/iniciar-sesion', validarInicioSesion, iniciarSesion);

// GET /auth/verificar — protegida, el frontend la llama al cargar para ver si la sesión sigue activa
enrutador.get('/verificar', verificarTokenMiddleware, verificarToken);

// GET /auth/solo-coordinador — solo coordinadores
enrutador.get(
  '/solo-coordinador',
  verificarTokenMiddleware,
  verificarRol('coordinador'),
  (solicitud, respuesta) => {
    respuesta.status(200).json({
      estado: 'exitoso',
      codigo: 200,
      mensaje: 'Acceso permitido para coordinador',
      datos: { usuario: solicitud.usuario },
    });
  }
);

// GET /auth/solo-jefe — coordinador y jefe de cuadrilla
enrutador.get(
  '/solo-jefe',
  verificarTokenMiddleware,
  verificarRol('coordinador', 'jefe_cuadrilla'),
  (solicitud, respuesta) => {
    respuesta.status(200).json({
      estado: 'exitoso',
      codigo: 200,
      mensaje: 'Acceso permitido para jefe de cuadrilla y coordinador',
      datos: { usuario: solicitud.usuario },
    });
  }
);

module.exports = enrutador;
