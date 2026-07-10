/**
 * Limpia un RUT dejando solo dígitos y, cuando corresponde, K como dígito verificador.
 * Limita el valor a 8 dígitos de cuerpo + 1 dígito verificador.
 */
export const limpiarRut = (valor = '') => {
  const caracteres = String(valor)
    .toUpperCase()
    .replace(/[^0-9K]/g, '');

  const terminaEnK = caracteres.endsWith('K');
  const digitos = caracteres.replace(/K/g, '');

  if (terminaEnK) {
    return `${digitos.slice(0, 8)}K`;
  }

  return digitos.slice(0, 9);
};

/**
 * Formatea progresivamente un RUT chileno.
 * Ejemplo: 123456789 -> 12.345.678-9
 */
export const formatearRutChileno = (valor = '') => {
  const limpio = limpiarRut(valor);

  if (!limpio) return '';
  if (limpio.length === 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const digitoVerificador = limpio.slice(-1);
  const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${cuerpoConPuntos}-${digitoVerificador}`;
};

/**
 * Devuelve el formato estable que usa actualmente el backend y la base de datos:
 * sin puntos, con guion y K mayúscula.
 */
export const normalizarRutParaBackend = (valor = '') => {
  const limpio = limpiarRut(valor);

  if (limpio.length < 2) return limpio;

  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
};

/**
 * Valida solo la estructura esperada por los formularios actuales.
 * Mantiene el mismo alcance de la validación previa: 7 u 8 dígitos de cuerpo + DV.
 */
export const validarFormatoRutChileno = (valor = '') => {
  const normalizado = normalizarRutParaBackend(valor);
  return /^\d{7,8}-[0-9K]$/i.test(normalizado);
};
