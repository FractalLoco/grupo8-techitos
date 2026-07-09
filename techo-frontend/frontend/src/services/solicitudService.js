import axios from 'axios';
import API_BASE from './apiBase.js';

const API = `${API_BASE}/api/solicitudes`;

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const crearSolicitud = (datos) =>
  axios.post(`${API}`, datos, headers()).then((r) => r.data);

export const listarTodasSolicitudes = () =>
  axios.get(`${API}`, headers()).then((r) => r.data);

export const listarSolicitudesPorEmergencia = (emergenciaId) =>
  axios.get(`${API}/emergencia/${emergenciaId}`, headers()).then((r) => r.data);

export const listarSolicitudesPorCuadrilla = (cuadrillaId) =>
  axios.get(`${API}/cuadrilla/${cuadrillaId}`, headers()).then((r) => r.data);

export const listarMisSolicitudes = () =>
  axios.get(`${API}/mis`, headers()).then((r) => r.data);

export const listarSolicitudesPorAprobar = () =>
  axios.get(`${API}/por-aprobar`, headers()).then((r) => r.data);

export const actualizarEstadoSolicitud = (id, estado, respuesta = null) =>
  axios.put(`${API}/${id}/estado`, { estado, respuesta }, headers()).then((r) => r.data);
