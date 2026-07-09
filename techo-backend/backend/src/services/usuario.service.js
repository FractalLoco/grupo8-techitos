'use strict';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { hashContrasena } from '../helpers/bcrypt.helper.js';
import { CorreoService } from './correo.service.js';
import { AuditoriaService } from './auditoria.service.js';

const CAMPOS_EDITABLES = ['nombre', 'rut', 'correo', 'rol'];

export class UsuarioService {
  static async listarUsuarios() {
    return UsuarioRepository.listar();
  }

  static filtrarCamposEditables(datos = {}) {
    return Object.fromEntries(
      CAMPOS_EDITABLES
        .filter((campo) => datos[campo] !== undefined)
        .map((campo) => [campo, datos[campo]])
    );
  }

  static async crearUsuario(datos, actor = null) {
    const existeRut = await UsuarioRepository.buscarPorRut(datos.rut);
    if (existeRut) throw new Error('Ya existe un usuario con ese RUT');

    const existeCorreo = await UsuarioRepository.buscarPorCorreo(datos.correo);
    if (existeCorreo) throw new Error('Ya existe un usuario con ese correo');

    const contrasenaPlano = String(datos.contrasena || '').trim();
    if (!contrasenaPlano) {
      throw new Error('La contraseña es obligatoria');
    }
    if (contrasenaPlano.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const contrasenaHash = await hashContrasena(contrasenaPlano);

    const usuario = await UsuarioRepository.crear({
      ...this.filtrarCamposEditables(datos),
      contrasena: contrasenaHash,
      activo: false,
    });

    try {
      await CorreoService.enviarCredenciales({
        nombre: usuario.nombre,
        correo: usuario.correo,
        rut: usuario.rut,
        contrasena: contrasenaPlano,
        motivo: 'creacion',
      });
    } catch (error) {
      await UsuarioRepository.eliminar(usuario.id).catch(() => {});
      throw new Error(`No se pudo enviar el correo de credenciales. Registro cancelado: ${error.message}`);
    }

    await AuditoriaService.registrarSeguro({
      modulo: 'usuarios',
      accion: 'CREAR_USUARIO',
      entidadId: usuario.id,
      entidadNombre: usuario.nombre,
      actor,
      descripcion: `Se creó la cuenta de ${usuario.nombre}.`,
      detalles: {
        rut: usuario.rut,
        correo: usuario.correo,
        rol: usuario.rol,
        activo: usuario.activo,
        credenciales_enviadas_por_correo: true,
      },
    });

    return {
      ...usuario,
      credenciales_enviadas_por_correo: true,
    };
  }

  static async actualizarUsuario(id, datos, actor = null) {
    const usuarioAntes = await UsuarioRepository.buscarPorIdConContrasena(id);
    if (!usuarioAntes) throw new Error('Usuario no encontrado');

    const cambiosPermitidos = this.filtrarCamposEditables(datos);
    const contrasenaPlano = String(datos.contrasena || '').trim();

    if (contrasenaPlano && contrasenaPlano.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    if (cambiosPermitidos.rut && cambiosPermitidos.rut !== usuarioAntes.rut) {
      const existente = await UsuarioRepository.buscarPorRut(cambiosPermitidos.rut);
      if (existente && Number(existente.id) !== Number(id)) {
        throw new Error('Ya existe un usuario con ese RUT');
      }
    }

    if (cambiosPermitidos.correo && cambiosPermitidos.correo !== usuarioAntes.correo) {
      const existente = await UsuarioRepository.buscarPorCorreo(cambiosPermitidos.correo);
      if (existente && Number(existente.id) !== Number(id)) {
        throw new Error('Ya existe un usuario con ese correo');
      }
    }

    if (contrasenaPlano) {
      cambiosPermitidos.contrasena = await hashContrasena(contrasenaPlano);
    }

    const usuario = await UsuarioRepository.actualizar(id, cambiosPermitidos);
    const cambios = AuditoriaService.calcularCambios(
      usuarioAntes,
      usuario,
      CAMPOS_EDITABLES
    );

    if (contrasenaPlano) {
      cambios.credencial_acceso = {
        antes: usuarioAntes.contrasena ? 'definida' : 'sin definir',
        despues: 'actualizada',
      };
    }

    await AuditoriaService.registrarSeguro({
      modulo: 'usuarios',
      accion: 'ACTUALIZAR_USUARIO',
      entidadId: usuario.id,
      entidadNombre: usuario.nombre,
      actor,
      descripcion: `Se actualizaron los datos de ${usuario.nombre}.`,
      detalles: { cambios },
    });

    return usuario;
  }

  static async cambiarEstado(id, activo, actor = null) {
    const usuario = await UsuarioRepository.buscarPorId(id);
    if (!usuario) throw new Error('Usuario no encontrado');

    if (!activo) {
      const actualizado = await UsuarioRepository.cambiarEstadoActivo(id, false);

      await AuditoriaService.registrarSeguro({
        modulo: 'usuarios',
        accion: 'DESACTIVAR_USUARIO',
        entidadId: actualizado.id,
        entidadNombre: actualizado.nombre,
        actor,
        descripcion: `Se desactivó la cuenta de ${actualizado.nombre}.`,
        detalles: {
          estado_anterior: usuario.activo ? 'activo' : 'inactivo',
          estado_nuevo: 'inactivo',
        },
      });

      return actualizado;
    }

    if (usuario.activo) {
      throw new Error('El usuario ya está activo');
    }

    // Activar una cuenta solo cambia su estado. La contraseña existente se
    // conserva exactamente como está almacenada y nunca se regenera aquí.
    const actualizado = await UsuarioRepository.cambiarEstadoActivo(id, true);

    try {
      await CorreoService.enviarCuentaActivada({
        nombre: actualizado.nombre,
        correo: actualizado.correo,
        rut: actualizado.rut,
      });
    } catch (error) {
      // Mantengo el comportamiento transaccional anterior: si no se puede
      // notificar la activación, restauro solo el estado previo. La contraseña
      // no se toca en ningún momento.
      await UsuarioRepository.cambiarEstadoActivo(id, usuario.activo).catch(() => {});

      throw new Error(`No se pudo enviar el correo de activación. La cuenta no fue activada: ${error.message}`);
    }

    await AuditoriaService.registrarSeguro({
      modulo: 'usuarios',
      accion: 'ACTIVAR_USUARIO',
      entidadId: actualizado.id,
      entidadNombre: actualizado.nombre,
      actor,
      descripcion: `Se activó la cuenta de ${actualizado.nombre} sin modificar su contraseña.`,
      detalles: {
        estado_anterior: 'inactivo',
        estado_nuevo: 'activo',
        contrasena_modificada: false,
        notificacion_activacion_enviada: true,
      },
    });

    return actualizado;
  }
}
