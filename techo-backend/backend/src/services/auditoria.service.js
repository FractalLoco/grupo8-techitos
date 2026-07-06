'use strict';
import { AuditoriaRepository } from '../repositories/auditoria.repository.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';

const CLAVES_SENSIBLES = new Set([
  'contrasena',
  'contraseña',
  'password',
  'token',
  'authorization',
  'credenciales_temporales',
]);

export class AuditoriaService {
  static limpiarDetalles(valor) {
    if (Array.isArray(valor)) {
      return valor.map((item) => this.limpiarDetalles(item));
    }

    if (valor && typeof valor === 'object') {
      return Object.fromEntries(
        Object.entries(valor)
          .filter(([clave]) => !CLAVES_SENSIBLES.has(String(clave).toLowerCase()))
          .map(([clave, contenido]) => [clave, this.limpiarDetalles(contenido)])
      );
    }

    return valor;
  }

  static async obtenerActor(actor) {
    if (!actor?.id) {
      return {
        actor_usuario_id: null,
        actor_nombre: actor?.nombre || 'Registro público',
        actor_rol: actor?.rol || 'publico',
      };
    }

    const usuario = await UsuarioRepository.buscarPorId(actor.id).catch(() => null);

    return {
      actor_usuario_id: Number(actor.id),
      actor_nombre: usuario?.nombre || actor?.nombre || `Usuario #${actor.id}`,
      actor_rol: usuario?.rol || actor?.rol || null,
    };
  }

  static calcularCambios(antes = {}, despues = {}, campos = []) {
    const cambios = {};

    for (const campo of campos) {
      const valorAntes = antes?.[campo] ?? null;
      const valorDespues = despues?.[campo] ?? null;

      if (JSON.stringify(valorAntes) !== JSON.stringify(valorDespues)) {
        cambios[campo] = {
          antes: valorAntes,
          despues: valorDespues,
        };
      }
    }

    return cambios;
  }

  static async registrar({
    modulo,
    accion,
    entidadId = null,
    entidadNombre = null,
    actor = null,
    descripcion = null,
    detalles = null,
  }) {
    const actorNormalizado = await this.obtenerActor(actor);

    return AuditoriaRepository.crear({
      modulo,
      accion,
      entidad_id: entidadId !== null && entidadId !== undefined ? Number(entidadId) : null,
      entidad_nombre: entidadNombre || null,
      ...actorNormalizado,
      descripcion: descripcion || null,
      detalles: detalles ? this.limpiarDetalles(detalles) : null,
    });
  }

  // La auditoría nunca debe romper la operación principal por un fallo accesorio de registro.
  // El error queda visible en consola para poder corregirlo sin entregar un falso fallo al usuario.
  static async registrarSeguro(datos) {
    try {
      return await this.registrar(datos);
    } catch (error) {
      console.error('No se pudo registrar auditoría:', error.message);
      return null;
    }
  }

  static async listar(filtros) {
    const resultado = await AuditoriaRepository.listar(filtros);
    const acciones = await AuditoriaRepository.listarAcciones();
    return { ...resultado, acciones };
  }
}
