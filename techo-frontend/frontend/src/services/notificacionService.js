const URL_BASE = import.meta.env.VITE_URL_BACKEND || 'http://localhost:3000';

function obtenerHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function manejarRespuesta(respuesta, mensajeError) {
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || mensajeError);
  }
  return datos.datos;
}

export async function listarNotificaciones() {
  const respuesta = await fetch(`${URL_BASE}/api/notificaciones`, {
    headers: obtenerHeaders(),
  });
  return manejarRespuesta(respuesta, 'Error al listar notificaciones');
}

export async function contarNoLeidas() {
  const respuesta = await fetch(`${URL_BASE}/api/notificaciones/no-leidas`, {
    headers: obtenerHeaders(),
  });
  const datos = await manejarRespuesta(respuesta, 'Error al contar no leídas');
  return datos.total || 0;
}

export async function marcarLeida(id) {
  const respuesta = await fetch(`${URL_BASE}/api/notificaciones/${id}/leer`, {
    method: 'PATCH',
    headers: obtenerHeaders(),
  });
  return manejarRespuesta(respuesta, 'Error al marcar como leída');
}

export async function marcarTodasLeidas() {
  const respuesta = await fetch(`${URL_BASE}/api/notificaciones/leer-todas`, {
    method: 'PATCH',
    headers: obtenerHeaders(),
  });
  return manejarRespuesta(respuesta, 'Error al marcar todas como leídas');
}
