'use strict';
import crypto from 'crypto';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { hashContrasena } from '../helpers/bcrypt.helper.js';

export class UsuarioService {
  static async listarUsuarios() {
    return UsuarioRepository.listar();
  }

  static generarContrasenaTemporal() {
    return crypto.randomBytes(4).toString('hex');
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
    const usuario = await UsuarioRepository.buscarPorId(id);
    if (!usuario) throw new Error('Usuario no encontrado');

    return UsuarioRepository.cambiarEstadoActivo(id, activo);
  }
}
