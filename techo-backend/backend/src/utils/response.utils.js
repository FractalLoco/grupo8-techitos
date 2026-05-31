'use strict';

// Construyo y envío una respuesta exitosa con estructura consistente en toda la API.
// Si hay datos para devolver los incluyo; si no, omito la propiedad para no enviar null innecesario.
export const respuestaExito = (respuesta, codigo, mensaje, datos = null) => {
  const cuerpo = { estado: 'exitoso', codigo, mensaje };
  if (datos) cuerpo.datos = datos;
  return respuesta.status(codigo).json(cuerpo);
};

// Construyo y envío una respuesta de error siguiendo el mismo formato que las respuestas exitosas.
// Así el frontend siempre puede esperar el mismo shape de objeto sin importar si hubo error o no.
export const respuestaError = (respuesta, codigo, mensaje, datos = null) => {
  const cuerpo = { estado: 'error', codigo, mensaje };
  if (datos) cuerpo.datos = datos;
  return respuesta.status(codigo).json(cuerpo);
};
