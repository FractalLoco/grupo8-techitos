import axios from 'axios';
import API_BASE from './apiBase.js';

const API = `${API_BASE}/api/obras`;

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const crearObra = (datos) =>
  axios.post(API, datos, headers()).then((r) => r.data);

export const listarObrasPorEmergencia = (emergenciaId) =>
  axios.get(`${API}/emergencia/${emergenciaId}`, headers()).then((r) => r.data);

export const listarTodasLasObras = () =>
  axios.get(`${API}/todas`, headers()).then((r) => r.data);

export const obtenerObra = (id) =>
  axios.get(`${API}/${id}`, headers()).then((r) => r.data);

export const actualizarEstadoObra = (id, estado) =>
  axios.patch(`${API}/${id}/estado`, { estado }, headers()).then((r) => r.data);
