'use strict';
import { verificarToken } from '../helpers/jwt.helper.js';

// Middleware que protege las rutas verificando que la solicitud traiga un token JWT válido.
// Si no hay token o es inválido, rechazo la solicitud antes de que llegue al controlador.
export const authMiddleware = (solicitud, respuesta, siguiente) => {
  // Extraigo el token del encabezado Authorization con formato "Bearer <token>"
  const encabezado = solicitud.headers['authorization'];
  const token = encabezado && encabezado.split(' ')[1];

  // Si no viene ningún token, el usuario no ha iniciado sesión
  if (!token) {
    return respuesta.status(401).json({
      estado: 'error',
      codigo: 401,
      mensaje: 'Acceso denegado. Debes iniciar sesión primero.',
    });
  }

  try {
    // Verifico la firma y la expiración del token; si pasa, adjunto los datos del usuario a la solicitud
    const datosDecodificados = verificarToken(token);
    solicitud.usuario = datosDecodificados;
    siguiente();
  } catch (error) {
    // Si el token expiró o fue manipulado, devuelvo 403 y pido que vuelva a iniciar sesión
    return respuesta.status(403).json({
      estado: 'error',
      codigo: 403,
      mensaje: 'Token inválido o sesión expirada. Inicia sesión nuevamente.',
    });
  }
};
