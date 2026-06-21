const URL_BASE = import.meta.env.VITE_URL_BACKEND || 'http://localhost:3000';
const API_URL = `${URL_BASE}/api/reportes`;

const obtenerHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// Valido la consistencia de datos de una emergencia antes de generar un reporte
export const validarEmergencia = async (emergenciaId) => {
  const respuesta = await fetch(
    `${API_URL}/emergencia/${emergenciaId}/validacion`,
    { headers: obtenerHeaders() },
  );
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'Error al validar');
  return datos.datos;
};

// Genero un reporte PDF para la emergencia, confirmando advertencias si es necesario
export const generarReporte = async (emergenciaId, confirmarConAdvertencias = false) => {
  const respuesta = await fetch(
    `${API_URL}/emergencia/${emergenciaId}`,
    {
      method: 'POST',
      headers: obtenerHeaders(),
      body: JSON.stringify({ confirmar_con_advertencias: confirmarConAdvertencias }),
    },
  );
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    if (respuesta.status === 409) {
      const error = new Error(datos.mensaje || 'La emergencia tiene datos incompletos');
      error.status = 409;
      error.advertencias = datos.datos?.advertencias;
      throw error;
    }
    throw new Error(datos.mensaje || 'Error al generar el reporte');
  }
  return datos.datos;
};

// Descargo un archivo PDF usando el endpoint del backend con JWT en el header
export const descargarPDF = async (reporteId, nombreArchivo) => {
  const token = localStorage.getItem('token');
  const respuesta = await fetch(`${API_URL}/${reporteId}/descargar`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!respuesta.ok) throw new Error('Error al descargar el PDF');
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo || `reporte-${reporteId}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
};

// Obtengo el historial de reportes filtrado por emergencia
export const listarReportes = async (emergenciaId) => {
  const params = emergenciaId ? `?emergencia_id=${emergenciaId}` : '';
  const respuesta = await fetch(`${API_URL}${params}`, {
    headers: obtenerHeaders(),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.mensaje || 'Error al listar reportes');
  return datos.datos;
};
