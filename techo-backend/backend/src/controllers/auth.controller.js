'use strict';
import { AuthService } from '../services/auth.service.js';
import { respuestaExito, respuestaError } from '../utils/response.utils.js';

// Recibo las credenciales del usuario y delego la autenticación al servicio.
// Si el login es exitoso devuelvo el token JWT y los datos públicos del usuario.
export const iniciarSesion = async (solicitud, respuesta) => {
  try {
    const { rut, contrasena } = solicitud.body;
    const resultado = await AuthService.iniciarSesion(rut, contrasena);
    return respuestaExito(respuesta, 200, 'Sesión iniciada correctamente', resultado);
  } catch (error) {
    // Distingo entre cuenta deshabilitada (403) y credenciales incorrectas (401)
    if (error.message.includes('incorrectos') || error.message.includes('habilitada')) {
      const codigo = error.message.includes('habilitada') ? 403 : 401;
      return respuestaError(respuesta, codigo, error.message);
    }
    console.error('Error en iniciarSesion:', error.message);
    return respuestaError(respuesta, 500, 'Error interno del servidor');
  }
};

// Verifico que el token activo sigue siendo válido y devuelvo los datos actuales del usuario.
// El frontend usa este endpoint al recargar la página para mantener la sesión viva.
export const verificarSesion = async (solicitud, respuesta) => {
  try {
    const usuario = await AuthService.verificarToken(solicitud.usuario.id);
    return respuestaExito(respuesta, 200, 'Token válido', { usuario });
  } catch (error) {
    console.error('Error en verificarSesion:', error.message);
    return respuestaError(respuesta, 500, 'Error interno del servidor');
  }
};

// Registro un nuevo usuario en el sistema con cuenta inactiva por defecto.
// El coordinador deberá activar la cuenta manualmente para que el usuario pueda iniciar sesión.
export const registrarUsuario = async (solicitud, respuesta) => {
  try {
    const datos = solicitud.body;
    const usuario = await AuthService.registrarUsuario(datos);
    return respuestaExito(respuesta, 201, 'Usuario registrado correctamente', { usuario });
  } catch (error) {
    // Si el RUT o correo ya existen en el sistema, devuelvo un conflicto 409
    if (error.message.includes('Ya existe')) {
      return respuestaError(respuesta, 409, error.message);
    }
    console.error('Error en registrarUsuario:', error.message);
    return respuestaError(respuesta, 500, 'Error interno del servidor');
  }
};
