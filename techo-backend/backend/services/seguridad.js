const bcrypt = require('bcryptjs');

// encriptar una contraseña
const encriptarContrasena = async (contrasena) => {
  const saltRounds = 10;
  return await bcrypt.hash(contrasena, saltRounds);
};

// validar una contraseña contra su hash
const validarContrasena = async (contrasena, hash) => {
  return await bcrypt.compare(contrasena, hash);
};

module.exports = {
  encriptarContrasena,
  validarContrasena,
};
