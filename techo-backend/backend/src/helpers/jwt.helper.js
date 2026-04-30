'use strict';
import jwt from 'jsonwebtoken';

// Leo el secreto desde las variables de entorno; en producción siempre debe estar definido
const SECRETO = process.env.SECRETO_JWT || 'secreto_default_cambiar_en_produccion';
// Las sesiones duran 8 horas; pasado ese tiempo el usuario debe volver a iniciar sesión
const EXPIRACION = '8h';

// Genero un token JWT firmado con el payload (id y rol del usuario)
export const generarToken = (payload) => {
  return jwt.sign(payload, SECRETO, { expiresIn: EXPIRACION });
};

// Verifico y decodifico el token; si es inválido o expiró, jwt.verify lanza un error que capturo en el middleware
export const verificarToken = (token) => {
  return jwt.verify(token, SECRETO);
};
