const jwt = require('jsonwebtoken');

// este middleware va antes de cualquier ruta que requiera que el usuario esté logueado
// si no hay token o está vencido, corta la petición y responde con error
const verificarToken = (solicitud, respuesta, siguiente) => {
  const encabezadoAutorizacion = solicitud.headers['authorization'];

  // el token llega en el encabezado así: Bearer eyJhbGci...
  const token = encabezadoAutorizacion && encabezadoAutorizacion.split(' ')[1];

  if (!token) {
    return respuesta.status(401).json({
      estado: 'error',
      codigo: 401,
      mensaje: 'Acceso denegado. Debes iniciar sesión primero.',
    });
  }

  try {
    // jwt.verify lanza un error si el token está vencido o fue modificado
    const datosDecodificados = jwt.verify(token, process.env.SECRETO_JWT);

    // guardamos los datos del usuario en la solicitud para usarlos más adelante
    solicitud.usuario = datosDecodificados;
    siguiente();

  } catch (error) {
    return respuesta.status(403).json({
      estado: 'error',
      codigo: 403,
      mensaje: 'Token inválido o sesión expirada. Inicia sesión nuevamente.',
    });
  }
};

module.exports = verificarToken;
