import API_BASE from './apiBase.js';

const API_URL = `${API_BASE}/api/usuarios`;

function obtenerHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function obtenerUsuarios() {
  const respuesta = await fetch(API_URL, {
    headers: obtenerHeaders(),
  });

  if (!respuesta.ok) {
    throw new Error("No se pudieron obtener los usuarios");
  }

  return respuesta.json();
}

export async function actualizarUsuario(id, datos) {
  const respuesta = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: obtenerHeaders(),
    body: JSON.stringify(datos),
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.mensaje || "Error al actualizar usuario");
  }

  return data;
}

export async function crearUsuario(datos) {
  const respuesta = await fetch(API_URL, {
    method: "POST",
    headers: obtenerHeaders(),
    body: JSON.stringify(datos),
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.mensaje || "Error al crear usuario");
  }

  return data;
}

export async function activarUsuario(id) {
  const respuesta = await fetch(`${API_URL}/${id}/activar`, {
    method: "PATCH",
    headers: obtenerHeaders(),
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.mensaje || "Error al activar usuario");
  }

  return data;
}

export async function desactivarUsuario(id) {
  const respuesta = await fetch(`${API_URL}/${id}/desactivar`, {
    method: "PATCH",
    headers: obtenerHeaders(),
  });

  const data = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(data.mensaje || "Error al desactivar usuario");
  }

  return data;
}
