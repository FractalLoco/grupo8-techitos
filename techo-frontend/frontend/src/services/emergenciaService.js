import axios from 'axios';
import API_BASE from './apiBase.js';

const API_URL = `${API_BASE}/api/emergencias`;

const obtenerHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
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

export const obtenerFamilias =
async (emergenciaId)=>{

 const response=
 await axios.get(
   `${API_URL}/${emergenciaId}/familias`,
   obtenerHeaders()
 );

 return response.data;
};

export const registrarFamilia =
async (
 emergenciaId,
 datos
)=>{

 const response=
 await axios.post(
   `${API_URL}/${emergenciaId}/familias`,
   datos,
   obtenerHeaders()
 );

 return response.data;
};

export const obtenerEvaluaciones =
async(emergenciaId)=>{

 const response=
 await axios.get(
 `${API_URL}/${emergenciaId}/evaluaciones`,
 obtenerHeaders()
 );

 return response.data;
};

export const actualizarEmergencia = async (id,data) => {
  const response = await axios.put(
    `${API_URL}/${id}`,
    data,
    obtenerHeaders()
  );

  return response.data;
};

export const cerrarEmergencia = async (id) => {

  const response = await axios.put(
    `${API_URL}/${id}/finalizar`,
    {},
    obtenerHeaders()
  );

  return response.data;
};