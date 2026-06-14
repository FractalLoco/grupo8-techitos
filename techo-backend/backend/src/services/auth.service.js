'use strict';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { hashContrasena, compararContrasena } from '../helpers/bcrypt.helper.js';
import { generarToken } from '../helpers/jwt.helper.js';
import { UserResponseDTO } from '../dtos/user-response.dto.js';

export class AuthService {
  // Autentico al usuario buscándolo por RUT, verificando que esté activo y comparando su contraseña con bcrypt.
  // Si todo es correcto genero un JWT con su ID y rol para las siguientes solicitudes.
  static async iniciarSesion(rut, contrasena) {
    const usuario = await UsuarioRepository.buscarPorRut(rut);

    // Uso el mismo mensaje para rut y contraseña incorrectos para no revelar cuál falló
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

    // Firmo solo el ID y el rol; no incluyo datos sensibles en el payload del token
    const token = generarToken({ id: usuario.id, rol: usuario.rol });

    return {
      token,
      usuario: UserResponseDTO.fromEntity(usuario),
    };
  }

  // Busco el usuario por ID para confirmar que sigue existiendo y que su cuenta es válida.
  // El frontend llama a esto al recargar para restaurar la sesión sin pedir credenciales nuevamente.
  static async verificarToken(usuarioId) {
    const usuario = await UsuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    return UserResponseDTO.fromEntity(usuario);
  }

  // Registro un nuevo usuario con contraseña hasheada y cuenta inactiva.
  // El coordinador deberá activar la cuenta desde el panel de administración.
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

    return UserResponseDTO.fromEntity(nuevoUsuario);
  }
}
