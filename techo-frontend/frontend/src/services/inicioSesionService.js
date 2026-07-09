// Leo la URL del backend desde las variables de entorno de Vite; si no existe uso localhost como fallback
import API_BASE from './apiBase.js';
const URL_BASE = import.meta.env.VITE_URL_BACKEND || API_BASE || 'http://localhost:3000';

// Envío las credenciales al backend y devuelvo el token junto con los datos del usuario.
// Si el servidor responde con error, lanzo una excepción con el mensaje que viene del backend.
export const login = async (rut, contrasena) => {
  const respuesta = await fetch(`${URL_BASE}/api/auth/iniciar-sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rut, contrasena }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'Error al iniciar sesión');
  }

  // El backend devuelve { datos: { token, usuario } }; extraigo solo lo que necesito
  return datos.datos;
};

// Valido con el backend si el token guardado en localStorage sigue siendo válido.
// Devuelvo true si la sesión está activa o false ante cualquier error, incluso de red.
export const verificarSesion = async (token) => {
  try {
    const respuesta = await fetch(`${URL_BASE}/api/auth/verificar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return respuesta.ok;
  } catch {
    // Si el servidor no está disponible, trato la sesión como inválida
    return false;
  }
};

// Registro un nuevo usuario enviando todos sus datos al backend.
// El backend crea la cuenta como inactiva; el coordinador debe activarla manualmente.
export const registrarUsuario = async (datos) => {
  const respuesta = await fetch(`${URL_BASE}/api/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

  const datosRespuesta = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datosRespuesta.mensaje || 'Error al registrar usuario');
  }

  return datosRespuesta.datos;
};
