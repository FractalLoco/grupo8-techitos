'use strict';
import { Server } from 'socket.io';
import { verificarToken } from '../helpers/jwt.helper.js';
import { MensajeService } from '../services/mensaje.service.js';

let io = null;

const salaMensaje = (mensaje) => {
  if (mensaje.cuadrilla_id) return `cuadrilla:${mensaje.cuadrilla_id}`;
  if (mensaje.tipo === 'coordinadores') return 'coordinadores';
  if (mensaje.tipo === 'jefes') return 'jefes';
  return 'broadcast';
};

const asignarSalas = async (socket) => {
  const usuario = socket.data.usuario;
  socket.join('broadcast');

  if (usuario.rol === 'coordinador') {
    socket.join('coordinadores');
    socket.join('jefes');
  } else if (usuario.rol === 'jefe_cuadrilla') {
    socket.join('jefes');
  }

  const cuadrillas = await MensajeService.obtenerCuadrillasAccesibles(usuario);
  cuadrillas.forEach((cuadrilla) => socket.join(`cuadrilla:${cuadrilla.id}`));
};

export const configurarChatSocket = (servidorHttp) => {
  io = new Server(servidorHttp, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, siguiente) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return siguiente(new Error('No autenticado'));
      socket.data.usuario = verificarToken(token);
      return siguiente();
    } catch {
      return siguiente(new Error('Token invalido o expirado'));
    }
  });

  io.on('connection', async (socket) => {
    try {
      await asignarSalas(socket);
      socket.emit('chat:conectado');
    } catch (error) {
      console.error('error asignar salas de chat:', error.message);
      socket.disconnect(true);
    }
  });

  return io;
};

export const emitirMensajeChat = (mensaje) => {
  if (!io || !mensaje) return;
  io.to(salaMensaje(mensaje)).emit('chat:mensaje', mensaje);
};
