import axios from 'axios';
import API_BASE from './apiBase.js';
const API = `${API_BASE}/api/zonas-peligro`;

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const crearZona = (datos) =>
  axios.post(API, datos, headers()).then((r) => r.data);

export const listarZonasPorEmergencia = (emergenciaId) =>
  axios.get(`${API}/emergencia/${emergenciaId}`, headers()).then((r) => r.data);

export const listarTodasLasZonas = () =>
  axios.get(`${API}/todas`, headers()).then((r) => r.data);

export const actualizarZona = (id, datos) =>
  axios.put(`${API}/${id}`, datos, headers()).then((r) => r.data);

export const eliminarZona = (id) =>
  axios.delete(`${API}/${id}`, headers()).then((r) => r.data);
