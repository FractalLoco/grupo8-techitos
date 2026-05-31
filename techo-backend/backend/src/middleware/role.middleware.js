'use strict';

// Middleware de control de acceso por rol.
// Lo uso para restringir rutas a roles específicos sin repetir lógica en cada controlador.
// Acepto uno o varios roles permitidos y devuelvo un middleware configurado para esa ruta.
export const roleMiddleware = (...rolesPermitidos) => {
  return (solicitud, respuesta, siguiente) => {
    // Si no hay usuario en la solicitud, el authMiddleware no se ejecutó antes; rechazo con 401
    if (!solicitud.usuario) {
      return respuesta.status(401).json({
        estado: 'error',
        codigo: 401,
        mensaje: 'No autenticado',
      });
    }

    const rolDelUsuario = solicitud.usuario.rol;

    // Verifico si el rol del usuario está dentro de los permitidos para esta ruta
    if (!rolesPermitidos.includes(rolDelUsuario)) {
      return respuesta.status(403).json({
        estado: 'error',
        codigo: 403,
        mensaje: `Acceso denegado. Roles permitidos: ${rolesPermitidos.join(', ')}`,
        datos: { rolActual: rolDelUsuario, rolesPermitidos },
      });
    }

    // El rol es válido; dejo pasar la solicitud al siguiente handler
    siguiente();
  };
};
