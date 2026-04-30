// este middleware se usa después de verificarToken
// sirve para limitar el acceso a ciertas rutas según el rol del usuario
// ejemplo: router.get('/ruta', verificarToken, verificarRol('coordinador'), controller)

const verificarRol = (...rolesPermitidos) => {
  return (solicitud, respuesta, siguiente) => {

    // si por alguna razón no hay usuario en la solicitud, algo salió mal antes
    if (!solicitud.usuario) {
      return respuesta.status(401).json({
        estado: 'error',
        codigo: 401,
        mensaje: 'No autenticado',
      });
    }

    const rolDelUsuario = solicitud.usuario.rol;

    // revisamos si el rol del usuario está dentro de los que pueden entrar
    if (!rolesPermitidos.includes(rolDelUsuario)) {
      return respuesta.status(403).json({
        estado: 'error',
        codigo: 403,
        mensaje: `Acceso denegado. Solo tienen acceso: ${rolesPermitidos.join(', ')}`,
        datos: {
          rolActual:      rolDelUsuario,
          rolesPermitidos,
        },
      });
    }

    // si el rol está ok dejamos pasar
    siguiente();
  };
};

module.exports = verificarRol;
