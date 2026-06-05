'use strict';
import { HerramientaRepository } from '../repositories/herramienta.repository.js';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { NotificacionService } from '../services/notificacion.service.js';

export class HerramientaService {
  // Registro una herramienta individual asignándola a la cuadrilla indicada
  static async registrar(cuadrillaId, nombre) {
    return HerramientaRepository.registrar({ cuadrilla_id: cuadrillaId, nombre });
  }

  // Devuelvo todas las herramientas asociadas a una cuadrilla para su revisión o inventario
  static async listarPorCuadrilla(cuadrillaId) {
    return HerramientaRepository.listarPorCuadrilla(cuadrillaId);
  }

  // Actualizo el estado de una herramienta (buena, dañada, perdida, etc.) junto con observaciones opcionales
  static async actualizarEstado(id, estado, observaciones = null) {
    return HerramientaRepository.actualizarEstado(id, estado, observaciones);
  }

  // Genero el balance consolidado de herramientas de una cuadrilla para el cierre de la obra
  static async generarBalance(cuadrillaId) {
    return HerramientaRepository.generarBalance(cuadrillaId);
  }

  // Cierro el balance del día: si hay diferencias activo la alerta en la cuadrilla y notifico al coordinador.
  // Solo activo la alerta la primera vez para no duplicar notificaciones en cierres sucesivos.
  static async cerrarBalance(cuadrillaId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    const balance = await HerramientaRepository.generarBalance(cuadrillaId);

    if (balance.conDiferencias && !cuadrilla.alerta_herramienta) {
      const resumen = `Dañadas: ${balance.danadas}, Perdidas: ${balance.perdidas}, No devueltas: ${balance.noDevueltas}`;
      await CuadrillaRepository.actualizar(cuadrillaId, {
        alerta_herramienta: true,
        descripcion_alerta_herramienta: resumen,
      });

      const coordinadores = await UsuarioRepository.buscarPorRol('coordinador');
      const titulo = `Alerta de herramientas: cuadrilla "${cuadrilla.nombre}"`;
      const mensaje = `Balance con diferencias detectadas. ${resumen}.`;

      await Promise.all(
        coordinadores.map((c) =>
          NotificacionService.crearNotificacion(c.id, titulo, mensaje, 'alerta_herramienta', cuadrillaId)
        )
      );
    }

    return { ...balance, alerta_activada: balance.conDiferencias };
  }

  // Registro múltiples herramientas en lote para agilizar el proceso de preparación de la cuadrilla
  static async registrarHerramientasMasivas(cuadrillaId, nombres) {
    const resultados = [];
    for (const nombre of nombres) {
      const herramienta = await HerramientaRepository.registrar({ cuadrilla_id: cuadrillaId, nombre });
      resultados.push(herramienta);
    }
    return resultados;
  }
}
