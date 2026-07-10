import API_BASE from './apiBase.js';
const API_URL = `${API_BASE}/api/auditorias`;

function obtenerHeaders() {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function obtenerAuditorias({
  modulo = 'todos',
  accion = 'todos',
  busqueda = '',
  fechaDesde = '',
  fechaHasta = '',
  pagina = 1,
  limite = 15,
} = {}) {
  const parametros = new URLSearchParams({
    modulo,
    accion,
    busqueda,
    fechaDesde,
    fechaHasta,
    pagina: String(pagina),
    limite: String(limite),
  });

  const respuesta = await fetch(`${API_URL}?${parametros.toString()}`, {
    headers: obtenerHeaders(),
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.mensaje || 'No se pudo obtener el historial de auditorías');
  }

  return data;
}
