import axios from 'axios';

const API = 'http://localhost:3000/api/herramientas';

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// Las rutas de herramientas viven bajo /api/herramientas/:cuadrillaId en el backend
export const registrarHerramienta = (cuadrillaId, nombre) =>
  axios.post(`${API}/${cuadrillaId}`, { nombre }, headers()).then((r) => r.data);

export const registrarHerramientasMasivas = (cuadrillaId, nombres) =>
  axios.post(`${API}/${cuadrillaId}/masivo`, { nombres }, headers()).then((r) => r.data);

export const listarHerramientas = (cuadrillaId) =>
  axios.get(`${API}/${cuadrillaId}`, headers()).then((r) => r.data);

// El estado se actualiza con /estado al final del ID de la herramienta
export const actualizarEstadoHerramienta = (herramientaId, estado, observaciones = null) =>
  axios
    .put(`${API}/${herramientaId}/estado`, { estado, observaciones }, headers())
    .then((r) => r.data);

// Resumen de inventario de herramientas agrupado por cuadrilla para toda una emergencia
export const obtenerInventarioTotal = () =>
  axios.get(`${API}/inventario`, headers()).then((r) => r.data);

export const obtenerResumenEmergencia = (emergenciaId) =>
  axios.get(`${API}/emergencia/${emergenciaId}`, headers()).then((r) => r.data);
