'use strict';
import { HerramientaRepository } from '../repositories/herramienta.repository.js';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { NotificacionService } from '../services/notificacion.service.js';

// Valores válidos alineados con los checks de la entidad Herramienta
const TIPOS_ITEM_VALIDOS = ['herramienta', 'epp', 'material', 'otro'];
const ESTADOS_HERRAMIENTA_VALIDOS = ['entregada', 'buena', 'danada', 'perdida', 'no_devuelta'];
const LARGO_MAX_NOMBRE = 100;

// Normalizo y valido el nombre de una herramienta según el límite de la columna
function validarNombreHerramienta(nombre) {
  const limpio = String(nombre || '').trim();
  if (!limpio) {
    throw new Error('El nombre de la herramienta es obligatorio');
  }
  if (limpio.length > LARGO_MAX_NOMBRE) {
    throw new Error(`El nombre de la herramienta no puede superar los ${LARGO_MAX_NOMBRE} caracteres`);
  }
  return limpio;
}

// Valido que el tipo del ítem esté dentro de las categorías permitidas
function validarTipoItem(tipo_item) {
  if (!TIPOS_ITEM_VALIDOS.includes(tipo_item)) {
    throw new Error(`El tipo de ítem debe ser uno de: ${TIPOS_ITEM_VALIDOS.join(', ')}`);
  }
  return tipo_item;
}

export class HerramientaService {
  // Registro una herramienta individual asignándola a la cuadrilla indicada
  // tipo_item puede ser: herramienta | epp | material | otro (por defecto herramienta)
  static async registrar(cuadrillaId, nombre, tipo_item = 'herramienta') {
    const cuadrilla_id = Number(cuadrillaId);
    if (!Number.isInteger(cuadrilla_id)) {
      throw new Error('Cuadrilla inválida');
    }
    const nombreLimpio = validarNombreHerramienta(nombre);
    validarTipoItem(tipo_item);

    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrilla_id);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    return HerramientaRepository.registrar({ cuadrilla_id, nombre: nombreLimpio, tipo_item });
  }

  // Devuelvo todas las herramientas asociadas a una cuadrilla para su revisión o inventario
  static async listarPorCuadrilla(cuadrillaId) {
    return HerramientaRepository.listarPorCuadrilla(cuadrillaId);
  }

  // Actualizo el estado de una herramienta (buena, dañada, perdida, etc.) junto con observaciones opcionales
  static async actualizarEstado(id, estado, observaciones = null) {
    if (!ESTADOS_HERRAMIENTA_VALIDOS.includes(estado)) {
      throw new Error(`Estado de herramienta inválido. Debe ser uno de: ${ESTADOS_HERRAMIENTA_VALIDOS.join(', ')}`);
    }
    const herramienta = await HerramientaRepository.buscarPorId(id);
    if (!herramienta) {
      throw new Error('Herramienta no encontrada');
    }
    return HerramientaRepository.actualizarEstado(id, estado, observaciones?.trim() || null);
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

      try {
        await Promise.all(
          coordinadores.map((c) =>
            NotificacionService.crearNotificacion(c.id, titulo, mensaje, 'alerta_herramienta', cuadrillaId)
          )
        );
      } catch {
        // Las notificaciones no bloquean el cierre del balance
      }
    }

    return { ...balance, alerta_activada: balance.conDiferencias };
  }

  // Devuelvo el resumen de inventario de herramientas agrupado por cuadrilla para toda la emergencia
  static async inventarioTotal() {
    return HerramientaRepository.inventarioTotal();
  }

  static async resumenPorEmergencia(emergenciaId) {
    return HerramientaRepository.resumenPorEmergencia(emergenciaId);
  }

  // Devuelvo el catálogo de ítems agrupado por nombre y tipo para la vista de inventario completo
  static async catalogoInventario() {
    return HerramientaRepository.catalogoInventario();
  }

  // Registro múltiples herramientas en lote para agilizar el proceso de preparación de la cuadrilla
  // Cada entrada puede ser un string (nombre) o un objeto { nombre, tipo_item }
  static async registrarHerramientasMasivas(cuadrillaId, nombres, tipo_item = 'herramienta') {
    const cuadrilla_id = Number(cuadrillaId);
    if (!Number.isInteger(cuadrilla_id)) {
      throw new Error('Cuadrilla inválida');
    }
    if (!Array.isArray(nombres) || nombres.length === 0) {
      throw new Error('Debes enviar al menos una herramienta para registrar');
    }

    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrilla_id);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    // Valido todos los ítems antes de guardar ninguno para no dejar registros a medias
    const aRegistrar = nombres.map((item) => {
      const nombre = typeof item === 'string' ? item : item?.nombre;
      const tipo   = typeof item === 'string' ? tipo_item : (item?.tipo_item || tipo_item);
      return { nombre: validarNombreHerramienta(nombre), tipo_item: validarTipoItem(tipo) };
    });

    const resultados = [];
    for (const { nombre, tipo_item: tipo } of aRegistrar) {
      const herramienta = await HerramientaRepository.registrar({ cuadrilla_id, nombre, tipo_item: tipo });
      resultados.push(herramienta);
    }
    return resultados;
  }
}
