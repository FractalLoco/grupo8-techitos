import axios from 'axios';
import API_BASE from './apiBase.js';

const API = `${API_BASE}/api/cuadrillas`;

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const listarCuadrillas = (emergenciaId) =>
  axios.get(`${API}/emergencia/${emergenciaId}`, headers()).then((r) => r.data);

export const listarCuadrillasConEstado = (emergenciaId, color = null) => {
  const url = color
    ? `${API}/emergencia/${emergenciaId}/estado?color=${color}`
    : `${API}/emergencia/${emergenciaId}/estado`;
  return axios.get(url, headers()).then((r) => r.data);
};

export const listarTodasLasCuadrillasConEstado = (color = null) => {
  const url = color ? `${API}/todas/estado?color=${color}` : `${API}/todas/estado`;
  return axios.get(url, headers()).then((r) => r.data);
};

export const crearCuadrilla = (datos) =>
  axios.post(API, datos, headers()).then((r) => r.data);

export const agregarMiembro = (cuadrillaId, datos) =>
  axios.post(`${API}/${cuadrillaId}/miembros`, datos, headers()).then((r) => r.data);

export const eliminarMiembro = (cuadrillaId, voluntarioId) =>
  axios.delete(`${API}/${cuadrillaId}/miembros/${voluntarioId}`, headers()).then((r) => r.data);

export const asignarObra = (cuadrillaId, obraId) =>
  axios.put(`${API}/${cuadrillaId}/obra`, { obraId }, headers()).then((r) => r.data);

export const actualizarFase = (cuadrillaId, fase) =>
  axios.put(`${API}/${cuadrillaId}/fase`, { fase }, headers()).then((r) => r.data);

export const enviarAlertaEmergencia = (cuadrillaId, descripcion) =>
  axios.post(`${API}/${cuadrillaId}/alerta`, { descripcion }, headers()).then((r) => r.data);

export const completarCuadrilla = (cuadrillaId) =>
  axios.put(`${API}/${cuadrillaId}/completar`, {}, headers()).then((r) => r.data);

export const devolverHerramientas = (cuadrillaId) =>
  axios.put(`${API}/${cuadrillaId}/devolver-herramientas`, {}, headers()).then((r) => r.data);

export const reasignarVoluntario = (cuadrillaOrigenId, voluntarioId, cuadrillaDestinoId) =>
  axios
    .put(`${API}/reasignar/${cuadrillaOrigenId}/${voluntarioId}`, { cuadrillaDestinoId }, headers())
    .then((r) => r.data);

export const obtenerBalanceHerramientas = (cuadrillaId) =>
  axios.get(`${API}/${cuadrillaId}/herramientas/balance`, headers()).then((r) => r.data);

export const cerrarBalanceDia = (cuadrillaId) =>
  axios.post(`${API}/${cuadrillaId}/herramientas/cierre`, {}, headers()).then((r) => r.data);
