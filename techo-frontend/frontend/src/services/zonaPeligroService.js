import axios from 'axios';

const API = 'http://localhost:3000/api/zonas-peligro';

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const crearZona = (datos) =>
  axios.post(API, datos, headers()).then((r) => r.data);

export const listarZonasPorEmergencia = (emergenciaId) =>
  axios.get(`${API}/emergencia/${emergenciaId}`, headers()).then((r) => r.data);

export const actualizarZona = (id, datos) =>
  axios.put(`${API}/${id}`, datos, headers()).then((r) => r.data);

export const eliminarZona = (id) =>
  axios.delete(`${API}/${id}`, headers()).then((r) => r.data);
