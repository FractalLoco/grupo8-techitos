import axios from 'axios';
import API_BASE from './apiBase.js';

const API = `${API_BASE}/api/movimientos`;

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const registrarSalida = (datos) =>
  axios.post(API, datos, headers()).then((r) => r.data);

export const registrarStock = (datos) =>
  axios.post(`${API}/stock`, datos, headers()).then((r) => r.data);

export const listarMovimientos = (emergenciaId = null) => {
  const url = emergenciaId ? `${API}?emergenciaId=${emergenciaId}` : API;
  return axios.get(url, headers()).then((r) => r.data);
};

export const listarMovimientosPorCuadrilla = (cuadrillaId) =>
  axios.get(`${API}/cuadrilla/${cuadrillaId}`, headers()).then((r) => r.data);

export const registrarEntrada = (id, observaciones) =>
  axios.put(`${API}/${id}/entrada`, { observaciones }, headers()).then((r) => r.data);

export const consultarStockDisponible = (nombre_item, tipo_item) =>
  axios.get(`${API}/stock`, { params: { nombre_item, tipo_item }, ...headers() }).then((r) => r.data);
