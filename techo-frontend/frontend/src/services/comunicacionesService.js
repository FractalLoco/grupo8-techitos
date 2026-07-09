import { io } from 'socket.io-client';
import API_BASE from './apiBase.js';

const URL_BASE = import.meta.env.VITE_URL_BACKEND || API_BASE || 'http://localhost:3000';

function obtenerHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function manejarRespuesta(respuesta, mensajeError) {
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.mensaje || mensajeError);
  }
  return datos.datos;
}

export async function obtenerBroadcast() {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/broadcast`, {
    headers: obtenerHeaders(),
  });

  const datos = await manejarRespuesta(respuesta, 'No se pudo cargar el broadcast');
  return datos.mensajes || [];
}

export async function obtenerMensajesCuadrilla(cuadrillaId) {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/cuadrilla/${cuadrillaId}`, {
    headers: obtenerHeaders(),
  });

  const datos = await manejarRespuesta(respuesta, 'No se pudo cargar el chat de la cuadrilla');
  return datos.mensajes || [];
}

export async function enviarMensaje(payload) {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/enviar`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(payload),
  });

  const datos = await manejarRespuesta(respuesta, 'No se pudo enviar el mensaje');
  return datos.mensaje;
}

export async function enviarFotoAvance(cuadrillaId, foto, contenido = '', tipoHito = null) {
  const formulario = new FormData();
  formulario.append('foto', foto);
  if (contenido.trim()) formulario.append('contenido', contenido.trim());
  if (tipoHito) formulario.append('tipo_hito', tipoHito);

  const token = localStorage.getItem('token');
  const respuesta = await fetch(
    `${URL_BASE}/api/comunicaciones/chat/cuadrilla/${cuadrillaId}/foto`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formulario,
    },
  );

  const datos = await manejarRespuesta(respuesta, 'No se pudo enviar la foto de avance');
  return datos.mensaje;
}

export function obtenerUrlArchivo(archivoUrl) {
  if (!archivoUrl) return '';
  if (/^https?:\/\//i.test(archivoUrl)) return archivoUrl;
  return `${URL_BASE}${archivoUrl.startsWith('/') ? '' : '/'}${archivoUrl}`;
}

export async function enviarEmergencia(payload) {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/emergencia`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(payload),
  });

  const datos = await manejarRespuesta(respuesta, 'No se pudo enviar la emergencia');
  return datos.mensaje;
}

export async function obtenerCuadrillasAccesibles() {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/cuadrillas`, {
    headers: obtenerHeaders(),
  });

  const datos = await manejarRespuesta(respuesta, 'No se pudieron cargar las cuadrillas');
  return datos.cuadrillas || [];
}

export function conectarChatTiempoReal(token) {
  return io(URL_BASE, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
  });
}

export async function enviarFotoCanalCoordinador(canal, foto, contenido = '') {
  const formulario = new FormData();
  formulario.append('foto', foto);
  if (contenido.trim()) formulario.append('contenido', contenido.trim());

  const token = localStorage.getItem('token');
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/${canal}/foto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });

  const datos = await manejarRespuesta(respuesta, 'No se pudo enviar la foto');
  return datos.mensaje;
}

export async function enviarArchivoChat(canal, cuadrillaId, archivo, contenido = '') {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  formulario.append('canal', canal);
  if (cuadrillaId) formulario.append('cuadrilla_id', cuadrillaId);
  if (contenido.trim()) formulario.append('contenido', contenido.trim());

  const token = localStorage.getItem('token');
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/archivo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });
  const datos = await manejarRespuesta(respuesta, 'No se pudo enviar el archivo');
  return datos.mensaje;
}

export async function obtenerChatCoordinadores() {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/coordinadores`, {
    headers: obtenerHeaders(),
  });
  const datos = await manejarRespuesta(respuesta, 'No se pudo cargar el chat de coordinadores');
  return datos.mensajes || [];
}

export async function enviarMensajeCoordinadores(contenido, prioridad = false) {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/coordinadores`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify({ contenido, prioridad }),
  });
  const datos = await manejarRespuesta(respuesta, 'No se pudo enviar el mensaje');
  return datos.mensaje;
}

export async function obtenerChatJefes() {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/jefes`, {
    headers: obtenerHeaders(),
  });
  const datos = await manejarRespuesta(respuesta, 'No se pudo cargar el chat de jefes');
  return datos.mensajes || [];
}

export async function enviarMensajeJefes(contenido) {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/chat/jefes`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify({ contenido }),
  });
  const datos = await manejarRespuesta(respuesta, 'No se pudo enviar el mensaje');
  return datos.mensaje;
}

export async function obtenerIntegrantesCuadrilla(cuadrillaId) {
  const respuesta = await fetch(
    `${URL_BASE}/api/comunicaciones/cuadrillas/${cuadrillaId}/integrantes`,
    { headers: obtenerHeaders() },
  );

  const datos = await manejarRespuesta(respuesta, 'No se pudieron cargar los integrantes');
  return datos.integrantes || [];
}

export async function marcarAvance(cuadrillaId, hito, contenido = '') {
  const respuesta = await fetch(`${URL_BASE}/api/comunicaciones/cuadrilla/${cuadrillaId}/marcar-avance`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify({ hito, contenido }),
  });

  const datos = await manejarRespuesta(respuesta, 'No se pudo registrar el avance');
  return datos.mensaje;
}
