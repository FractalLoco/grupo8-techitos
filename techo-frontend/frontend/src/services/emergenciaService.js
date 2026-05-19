import axios from 'axios';

const API_URL = 'http://localhost:3000/api/emergencias';

export const obtenerEmergencias = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const crearEmergencia = async (data) => {
  const response = await axios.post(API_URL, data);
  return response.data;
};

export const actualizarEmergencia = async (id, data) => {
  const response = await axios.put(`${API_URL}/${id}`, data);
  return response.data;
};

export const cerrarEmergencia = async (id) => {
  const response = await axios.patch(`${API_URL}/${id}/cerrar`);
  return response.data;
};
