'use strict';
import multer from 'multer';
import { respuestaError } from '../utils/response.utils.js';

export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FOTO_BYTES,
    files: 1,
  },
});

export const procesarFotoChat = (req, res, next) => {
  upload.single('foto')(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return respuestaError(res, 400, 'La foto no puede superar los 5 MB');
    }

    return respuestaError(res, 400, 'No se pudo procesar la foto enviada');
  });
};
