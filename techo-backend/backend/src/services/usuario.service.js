'use strict';
import crypto from 'crypto';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { hashContrasena } from '../helpers/bcrypt.helper.js';
import { CorreoService } from './correo.service.js';

export class UsuarioService {
  static async listarUsuarios() {
    return UsuarioRepository.listar();
  }

  static generarContrasenaTemporal() {
    return crypto.randomBytes(6).toString('base64url');
  }

  static async crearUsuario(datos) {
    const existeRut = await UsuarioRepository.buscarPorRut(datos.rut);
    if (existeRut) throw new Error('Ya existe un usuario con ese RUT');

    const existeCorreo = await UsuarioRepository.buscarPorCorreo(datos.correo);
    if (existeCorreo) throw new Error('Ya existe un usuario con ese correo');

    const contrasenaTemporal = this.generarContrasenaTemporal();
    const contrasena = await hashContrasena(contrasenaTemporal);

    const usuario = await UsuarioRepository.crear({
      ...datos,
      contrasena,
      activo: false,
    });

    try {
      await CorreoService.enviarCredenciales({
        nombre: usuario.nombre,
        correo: usuario.correo,
        rut: usuario.rut,
        contrasena: contrasenaTemporal,
        motivo: 'creacion',
      });
    } catch (error) {
      // Si el correo no sale, elimino la cuenta recién creada para no dejar un registro sin credenciales entregadas.
      await UsuarioRepository.eliminar(usuario.id).catch(() => {});
      throw new Error(`No se pudo enviar el correo de credenciales. Registro cancelado: ${error.message}`);
    }

    return {
      ...usuario,
      credenciales_temporales: {
        rut: usuario.rut,
        contrasena: contrasenaTemporal,
      },
    };
  }

  static async actualizarUsuario(id, datos) {
    const usuario = await UsuarioRepository.buscarPorId(id);
    if (!usuario) throw new Error('Usuario no encontrado');

    return UsuarioRepository.actualizar(id, datos);
  }

  static async cambiarEstado(id, activo) {
    const usuario = await UsuarioRepository.buscarPorIdConContrasena(id);
    if (!usuario) throw new Error('Usuario no encontrado');

    if (!activo) {
      return UsuarioRepository.cambiarEstadoActivo(id, false);
    }

    // Una activación exitosa siempre debe generar y enviar credenciales nuevas.
    // Si la cuenta ya estaba activa, rechazo la operación para no informar un envío que no ocurrió.
    if (usuario.activo) {
      throw new Error('El usuario ya está activo');
    }

    const contrasenaTemporal = this.generarContrasenaTemporal();
    const nuevoHash = await hashContrasena(contrasenaTemporal);

    await UsuarioRepository.actualizarCredencialesYEstado(id, nuevoHash, true);

    try {
      await CorreoService.enviarCredenciales({
        nombre: usuario.nombre,
        correo: usuario.correo,
        rut: usuario.rut,
        contrasena: contrasenaTemporal,
        motivo: 'activacion',
      });
    } catch (error) {
      // Restauro el hash y el estado anteriores para que una falla de correo no deje al usuario
      // con una contraseña desconocida ni una activación incompleta.
      await UsuarioRepository.actualizarCredencialesYEstado(
        id,
        usuario.contrasena,
        usuario.activo
      ).catch(() => {});

      throw new Error(`No se pudo enviar el correo de activación. La cuenta no fue activada: ${error.message}`);
    }

    return UsuarioRepository.buscarPorId(id);
  }
}
