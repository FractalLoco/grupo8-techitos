// Servicio para gestionar herramientas de una cuadrilla: registro, actualizacion de estado y balance

const BASE_URL = 'http://localhost:3000/api';

const obtenerHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// Obtiene la lista de herramientas de una cuadrilla con sus estados actuales
export const obtenerHerramientas = async (cuadrillaId) => {
  const res = await fetch(
    `${BASE_URL}/herramientas/${cuadrillaId}`,
    { headers: obtenerHeaders() }
  );
  return res.json();
};

// Registra una herramienta individual recibida al inicio de la jornada
export const registrarHerramienta = async (cuadrillaId, nombre) => {
  const res = await fetch(`${BASE_URL}/herramientas/${cuadrillaId}`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify({ nombre }),
  });
  return res.json();
};

// Registra varias herramientas a la vez desde un array de nombres
// Body que espera el backend: { nombres: ['martillo', 'pala', ...] }
export const registrarHerramientasMasivas = async (cuadrillaId, nombres) => {
  const res = await fetch(`${BASE_URL}/herramientas/${cuadrillaId}/masivo`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify({ nombres }),
  });
  return res.json();
};

// Cambia el estado de una herramienta: 'buena', 'danada', 'perdida' o 'no_devuelta'
// El campo observaciones describe el dano o la circunstancia de la perdida
export const actualizarEstadoHerramienta = async (herramientaId, estado, observaciones = '') => {
  const res = await fetch(`${BASE_URL}/herramientas/${herramientaId}/estado`, {
    method: 'PUT',
    headers: obtenerHeaders(),
    body: JSON.stringify({ estado, observaciones }),
  });
  return res.json();
};

// Obtiene el balance actual: cuantas herramientas estan en cada estado
export const obtenerBalance = async (cuadrillaId) => {
  const res = await fetch(
    `${BASE_URL}/cuadrillas/${cuadrillaId}/herramientas/balance`,
    { headers: obtenerHeaders() }
  );
  return res.json();
};

// Cierra el balance del dia: activa alerta en el mapa si hay herramientas danadas o perdidas
export const cerrarBalanceDia = async (cuadrillaId) => {
  const res = await fetch(`${BASE_URL}/cuadrillas/${cuadrillaId}/herramientas/cierre`, {
    method: 'POST',
    headers: obtenerHeaders(),
  });
  return res.json();
};
