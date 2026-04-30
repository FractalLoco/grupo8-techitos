'use strict';

// Valido los datos de inicio de sesión antes de que lleguen al controlador.
// Con esto evito procesar solicitudes incompletas y doy mensajes de error claros al usuario.
export const validarInicioSesion = (solicitud, respuesta, siguiente) => {
  const { rut, contrasena } = solicitud.body;

  // Rechazo si faltan campos obligatorios en el cuerpo de la solicitud
  if (!rut || !contrasena) {
    return respuesta.status(400).json({
      estado: 'error',
      codigo: 400,
      mensaje: 'El RUT y la contraseña son obligatorios',
    });
  }

  // Me aseguro de que no sean cadenas vacías con solo espacios
  if (rut.trim() === '' || contrasena.trim() === '') {
    return respuesta.status(400).json({
      estado: 'error',
      codigo: 400,
      mensaje: 'El RUT y la contraseña no pueden estar vacíos',
    });
  }

  // Exijo un mínimo de 6 caracteres en la contraseña para filtrar intentos inválidos
  if (contrasena.length < 6) {
    return respuesta.status(400).json({
      estado: 'error',
      codigo: 400,
      mensaje: 'La contraseña debe tener al menos 6 caracteres',
    });
  }

  // Todo es válido; paso la solicitud al controlador
  siguiente();
};
