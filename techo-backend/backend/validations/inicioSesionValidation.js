// validaciones del body antes de que lleguen al controller
// si algo falta o está mal formado, cortamos acá y avisamos

const validarInicioSesion = (solicitud, respuesta, siguiente) => {
  const { rut, contrasena } = solicitud.body;

  // verificamos que llegaron los dos campos obligatorios
  if (!rut || !contrasena) {
    return respuesta.status(400).json({
      estado: 'error',
      codigo: 400,
      mensaje: 'El RUT y la contraseña son obligatorios',
    });
  }

  // el rut no puede ser un string vacío con espacios
  if (rut.trim() === '' || contrasena.trim() === '') {
    return respuesta.status(400).json({
      estado: 'error',
      codigo: 400,
      mensaje: 'El RUT y la contraseña no pueden estar vacíos',
    });
  }

  // la contraseña debe tener al menos 6 caracteres
  if (contrasena.length < 6) {
    return respuesta.status(400).json({
      estado: 'error',
      codigo: 400,
      mensaje: 'La contraseña debe tener al menos 6 caracteres',
    });
  }

  // si todo está bien dejamos pasar al controller
  siguiente();
};

module.exports = { validarInicioSesion };
