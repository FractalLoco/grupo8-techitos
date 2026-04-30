// acá van todas las llamadas al backend relacionadas al login
// los componentes llaman estas funciones, nunca escriben fetch directamente

const URL_BASE = import.meta.env.VITE_URL_BACKEND || 'http://localhost:3000';

// llama al endpoint de login y devuelve los datos del usuario y el token
export const login = async (rut, contrasena) => {
  const respuesta = await fetch(`${URL_BASE}/auth/iniciar-sesion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rut, contrasena }),
  });

  const datos = await respuesta.json();

  // si el backend respondió con error lanzamos una excepción con el mensaje
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'Error al iniciar sesión');
  }

  return datos.datos;
};

// verifica si el token guardado en localStorage sigue siendo válido
// devuelve true si está bien, false si venció o está malo
export const verificarSesion = async (token) => {
  try {
    const respuesta = await fetch(`${URL_BASE}/auth/verificar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return respuesta.ok;
  } catch {
    // si el servidor no responde asumimos que la sesión no es válida
    return false;
  }
};
