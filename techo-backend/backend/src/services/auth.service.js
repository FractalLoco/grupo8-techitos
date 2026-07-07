'use strict';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { hashContrasena, compararContrasena } from '../helpers/bcrypt.helper.js';
import { generarToken } from '../helpers/jwt.helper.js';
import { UserResponseDTO } from '../dtos/user-response.dto.js';
import { CorreoService } from './correo.service.js';
import { AuditoriaService } from './auditoria.service.js';

export class AuthService {
  static async iniciarSesion(rut, contrasena) {
    const usuario = await UsuarioRepository.buscarPorRut(rut);

    if (!usuario) {
      throw new Error('RUT o contraseña incorrectos');
    }

    if (!usuario.activo) {
      throw new Error('Tu cuenta no está habilitada. Contacta al coordinador.');
    }

    const contrasenaValida = await compararContrasena(contrasena, usuario.contrasena);
    if (!contrasenaValida) {
      throw new Error('RUT o contraseña incorrectos');
    }

    const token = generarToken({ id: usuario.id, rol: usuario.rol });

    return {
      token,
      usuario: UserResponseDTO.fromEntity(usuario),
    };
  }

  static async verificarToken(usuarioId) {
    const usuario = await UsuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    return UserResponseDTO.fromEntity(usuario);
  }

  static async registrarUsuario(datos) {
    const existente = await UsuarioRepository.buscarPorRut(datos.rut);
    if (existente) {
      throw new Error('Ya existe un usuario con ese RUT');
    }

    const correoExistente = await UsuarioRepository.buscarPorCorreo(datos.correo);
    if (correoExistente) {
      throw new Error('Ya existe un usuario con ese correo');
    }

    const contrasenaHash = await hashContrasena(datos.contrasena);

    const nuevoUsuario = await UsuarioRepository.crear({
      nombre: datos.nombre,
      rut: datos.rut,
      correo: datos.correo,
      contrasena: contrasenaHash,
      rol: datos.rol || 'voluntario',
      activo: false,
    });

    try {
      await CorreoService.enviarCredenciales({
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        rut: nuevoUsuario.rut,
        contrasena: datos.contrasena,
        motivo: 'registro',
      });
    } catch (error) {
      await UsuarioRepository.eliminar(nuevoUsuario.id).catch(() => {});
      throw new Error(`No se pudo enviar el correo de credenciales. Registro cancelado: ${error.message}`);
    }

    await AuditoriaService.registrarSeguro({
      modulo: 'usuarios',
      accion: 'REGISTRO_PUBLICO',
      entidadId: nuevoUsuario.id,
      entidadNombre: nuevoUsuario.nombre,
      actor: { nombre: 'Registro público', rol: 'publico' },
      descripcion: `${nuevoUsuario.nombre} creó una solicitud de cuenta mediante el registro público.`,
      detalles: {
        rut: nuevoUsuario.rut,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
        activo: nuevoUsuario.activo,
        credenciales_enviadas_por_correo: true,
      },
    });

    return UserResponseDTO.fromEntity(nuevoUsuario);
  }
}
