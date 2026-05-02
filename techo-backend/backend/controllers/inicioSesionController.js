const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');
const { validarContrasena } = require('../services/seguridad');

// acá va toda la lógica del login
// la ruta llama este controller, el controller llama el model

const iniciarSesion = async (solicitud, respuesta) => {
  const { rut, contrasena } = solicitud.body;

  try {
    // le preguntamos al model si existe alguien con ese rut
    const usuario = await usuarioModel.buscarPorRut(rut);

    // si no encontramos a nadie respondemos igual que si la contraseña fuera mala
    // así no le damos pistas de qué ruts existen en el sistema
    if (!usuario) {
      return respuesta.status(401).json({
        estado: 'error',
        codigo: 401,
        mensaje: 'RUT o contraseña incorrectos',
      });
    }

    // el coordinador activa las cuentas manualmente, si no está activa no puede entrar
    if (!usuario.activo) {
      return respuesta.status(403).json({
        estado: 'error',
        codigo: 403,
        mensaje: 'Tu cuenta no está habilitada. Contacta al coordinador.',
      });
    }

    // validamos la contraseña usando el service de seguridad
    const contrasenaValida = await validarContrasena(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      return respuesta.status(401).json({
        estado: 'error',
        codigo: 401,
        mensaje: 'RUT o contraseña incorrectos',
      });
    }

    // si llegamos acá todo está bien, generamos el token con el id y el rol
    // el token dura 8 horas, suficiente para una jornada de trabajo en terreno
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.SECRETO_JWT,
      { expiresIn: '8h' }
    );

    return respuesta.status(200).json({
      estado: 'exitoso',
      codigo: 200,
      mensaje: 'Sesión iniciada correctamente',
      datos: {
        token,
        usuario: {
          id:     usuario.id,
          nombre: usuario.nombre,
          rol:    usuario.rol,
        },
      },
    });

  } catch (error) {
    // si explota algo con la base de datos lo registramos y avisamos genéricamente
    console.error('error en iniciarSesion controller:', error.message);
    return respuesta.status(500).json({
      estado: 'error',
      codigo: 500,
      mensaje: 'Error interno del servidor',
    });
  }
};

const verificarToken = async (solicitud, respuesta) => {
  try {
    // solicitud.usuario viene del middleware verificarToken
    // buscamos el usuario completo en la base de datos para devolver datos frescos
    const usuario = await usuarioModel.buscarPorId(solicitud.usuario.id);

    return respuesta.status(200).json({
      estado: 'exitoso',
      codigo: 200,
      mensaje: 'Token válido',
      datos: { usuario },
    });

  } catch (error) {
    console.error('error en verificarToken controller:', error.message);
    return respuesta.status(500).json({
      estado: 'error',
      codigo: 500,
      mensaje: 'Error interno del servidor',
    });
  }
};

module.exports = { iniciarSesion, verificarToken };
