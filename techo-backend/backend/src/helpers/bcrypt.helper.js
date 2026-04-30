'use strict';
import bcrypt from 'bcryptjs';

// Uso 10 rondas de sal; es el estándar de seguridad recomendado para producción
const SALT_ROUNDS = 10;

// Convierto la contraseña en texto plano a un hash seguro antes de guardarla en la base de datos
export const hashContrasena = async (contrasena) => {
  return bcrypt.hash(contrasena, SALT_ROUNDS);
};

// Comparo la contraseña que ingresa el usuario con el hash almacenado para autenticarlo
export const compararContrasena = async (contrasena, hash) => {
  return bcrypt.compare(contrasena, hash);
};
