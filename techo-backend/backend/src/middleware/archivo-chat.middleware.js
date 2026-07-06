'use strict';
import multer from 'multer';
import { respuestaError } from '../utils/response.utils.js';

export const MAX_ARCHIVO_CHAT_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ARCHIVO_CHAT_BYTES,
    files: 1,
  },
});

export const procesarArchivoChat = (req, res, next) => {
  upload.single('archivo')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return respuestaError(res, 400, 'El archivo no puede superar los 10 MB');
    }
    return respuestaError(res, 400, 'No se pudo procesar el archivo enviado');
  });
};
