// Servicio para gestionar cuadrillas: creacion, miembros, fases, alertas y reasignacion

const BASE_URL = 'http://localhost:3000/api';

const obtenerHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// Obtiene cuadrillas de una emergencia con estadoColor y miembrosCount ya calculados
export const obtenerCuadrillasPorEmergencia = async (emergenciaId) => {
  const res = await fetch(
    `${BASE_URL}/cuadrillas/emergencia/${emergenciaId}/estado`,
    { headers: obtenerHeaders() }
  );
  return res.json();
};

// Crea una nueva cuadrilla con nombre, jefe y plazo (2 o 5 dias)
export const crearCuadrilla = async (datos) => {
  const res = await fetch(`${BASE_URL}/cuadrillas`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datos),
  });
  return res.json();
};

// Agrega un voluntario a la cuadrilla; el backend valida el limite maximo de 11
export const agregarMiembro = async (cuadrillaId, voluntarioId, habilidades = '') => {
  const res = await fetch(`${BASE_URL}/cuadrillas/${cuadrillaId}/miembros`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify({ voluntarioId, habilidades }),
  });
  return res.json();
};

// Elimina un miembro de la cuadrilla; el backend valida que queden al menos 10
export const eliminarMiembro = async (cuadrillaId, voluntarioId) => {
  const res = await fetch(`${BASE_URL}/cuadrillas/${cuadrillaId}/miembros/${voluntarioId}`, {
    method: 'DELETE',
    headers: obtenerHeaders(),
  });
  return res.json();
};

// Asigna una obra a la cuadrilla y notifica a todos los integrantes con lat/lng y plazo
export const asignarObra = async (cuadrillaId, obraId) => {
  const res = await fetch(`${BASE_URL}/cuadrillas/${cuadrillaId}/obra`, {
    method: 'PUT',
    headers: obtenerHeaders(),
    body: JSON.stringify({ obraId }),
  });
  return res.json();
};

// El jefe actualiza la fase de avance: 'limpieza', 'montaje' o 'terminaciones'
export const actualizarFase = async (cuadrillaId, fase) => {
  const res = await fetch(`${BASE_URL}/cuadrillas/${cuadrillaId}/fase`, {
    method: 'PUT',
    headers: obtenerHeaders(),
    body: JSON.stringify({ fase }),
  });
  return res.json();
};

// El jefe activa una alerta de emergencia con descripcion del incidente
export const enviarAlertaEmergencia = async (cuadrillaId, descripcion) => {
  const res = await fetch(`${BASE_URL}/cuadrillas/${cuadrillaId}/alerta`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify({ descripcion }),
  });
  return res.json();
};

// El coordinador marca la cuadrilla como completada y libera a los voluntarios
export const completarCuadrilla = async (cuadrillaId) => {
  const res = await fetch(`${BASE_URL}/cuadrillas/${cuadrillaId}/completar`, {
    method: 'PUT',
    headers: obtenerHeaders(),
  });
  return res.json();
};

// Mueve un voluntario de una cuadrilla origen a una cuadrilla destino
export const reasignarVoluntario = async (cuadrillaOrigenId, voluntarioId, cuadrillaDestinoId) => {
  const res = await fetch(
    `${BASE_URL}/cuadrillas/reasignar/${cuadrillaOrigenId}/${voluntarioId}`,
    {
      method: 'PUT',
      headers: obtenerHeaders(),
      body: JSON.stringify({ cuadrillaDestinoId }),
    }
  );
  return res.json();
};

// Obtiene las obras disponibles de una emergencia para que el coordinador pueda asignarlas
export const obtenerObrasPorEmergencia = async (emergenciaId) => {
  const res = await fetch(
    `${BASE_URL}/obras/emergencia/${emergenciaId}`,
    { headers: obtenerHeaders() }
  );
  return res.json();
};
