import axios from 'axios';

const API = 'http://localhost:3000/api/obras';

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const crearObra = (datos) =>
  axios.post(API, datos, headers()).then((r) => r.data);

export const listarObrasPorEmergencia = (emergenciaId) =>
  axios.get(`${API}/emergencia/${emergenciaId}`, headers()).then((r) => r.data);

export const obtenerObra = (id) =>
  axios.get(`${API}/${id}`, headers()).then((r) => r.data);

export const actualizarEstadoObra = (id, estado) =>
  axios.patch(`${API}/${id}/estado`, { estado }, headers()).then((r) => r.data);
