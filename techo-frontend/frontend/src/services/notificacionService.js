import axios from 'axios';

const API = 'http://localhost:3000/api/notificaciones';

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const listarNotificaciones = () =>
  axios.get(API, headers()).then((r) => r.data);

export const marcarLeida = (id) =>
  axios.patch(`${API}/${id}/leida`, {}, headers()).then((r) => r.data);

export const marcarTodasLeidas = () =>
  axios.patch(`${API}/todas/leidas`, {}, headers()).then((r) => r.data);
