import axios from 'axios';

const API_URL = 'http://localhost:3000/api/emergencias';

const obtenerHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const obtenerEmergencias = async () => {
  const response = await axios.get(
    API_URL,
    obtenerHeaders()
  );

  return response.data;
};

export const crearEmergencia = async (data) => {
  const response = await axios.post(
    API_URL,
    data,
    obtenerHeaders()
  );

  return response.data;
};

export const actualizarEmergencia = async (id, data) => {
  const response = await axios.put(
    `${API_URL}/${id}`,
    data,
    obtenerHeaders()
  );

  return response.data;
};

export const cerrarEmergencia = async (id) => {
  const response = await axios.patch(
    `${API_URL}/${id}/finalizar`,
    {},
    obtenerHeaders()
  );

  return response.data;
};