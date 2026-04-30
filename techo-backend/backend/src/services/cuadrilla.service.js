'use strict';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { HerramientaRepository } from '../repositories/herramienta.repository.js';

// Defino los límites de integrantes como constantes para cambiarlos fácilmente si el requisito cambia
const MIN_MIEMBROS = 10;
const MAX_MIEMBROS = 11;

export class CuadrillaService {
  // Valido que exista una emergencia activa y que el jefe tenga el rol correcto antes de crear la cuadrilla.
  static async crearCuadrilla(datos) {
    const emergenciaActiva = await EmergenciaRepository.existeActiva();
    if (!emergenciaActiva) {
      throw new Error('No hay ninguna emergencia activa en el sistema');
    }

    const jefe = await UsuarioRepository.buscarPorId(datos.jefe_id);
    if (!jefe || jefe.rol !== 'jefe_cuadrilla') {
      throw new Error('El jefe de cuadrilla debe ser un usuario con rol jefe_cuadrilla');
    }

    return CuadrillaRepository.crear({
      nombre: datos.nombre,
      jefe_id: datos.jefe_id,
      emergencia_id: datos.emergencia_id,
      plazo_dias: datos.plazo_dias || 5,
    });
  }

  // Agrego un voluntario comprobando el límite máximo, que esté activo y que no pertenezca ya a otra cuadrilla.
  static async agregarMiembro(cuadrillaId, voluntarioId, habilidades = null) {
    const miembrosActuales = await MiembroCuadrillaRepository.contar(cuadrillaId);

    if (miembrosActuales >= MAX_MIEMBROS) {
      throw new Error(`Se ha superado el límite de ${MAX_MIEMBROS} integrantes por cuadrilla`);
    }

    const voluntario = await UsuarioRepository.buscarPorId(voluntarioId);
    if (!voluntario || !voluntario.activo) {
      throw new Error('El voluntario no está disponible');
    }

    // Verifico que el voluntario no esté ya asignado a cualquier otra cuadrilla del sistema
    const yaMiembro = await MiembroCuadrillaRepository.buscarVoluntarioEnCuadrilla(voluntarioId);
    if (yaMiembro) {
      throw new Error('El voluntario ya pertenece a una cuadrilla');
    }

    return MiembroCuadrillaRepository.agregar({
      cuadrilla_id: cuadrillaId,
      voluntario_id: voluntarioId,
      habilidades,
    });
  }

  // Elimino un miembro solo si la cuadrilla conserva el mínimo requerido de 10 integrantes.
  static async eliminarMiembro(cuadrillaId, voluntarioId) {
    const miembrosActuales = await MiembroCuadrillaRepository.contar(cuadrillaId);

    if (miembrosActuales <= MIN_MIEMBROS) {
      throw new Error(`La cuadrilla debe tener al menos ${MIN_MIEMBROS} integrantes`);
    }

    return MiembroCuadrillaRepository.eliminar(cuadrillaId, voluntarioId);
  }

  // Asigno la obra a la cuadrilla comprobando primero que la cuadrilla exista.
  static async asignarObra(cuadrillaId, obraId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    return CuadrillaRepository.asignarObra(cuadrillaId, obraId);
  }

  // Solo el jefe de la propia cuadrilla puede cambiar su fase; verifico el ID del usuario autenticado.
  static async actualizarFase(cuadrillaId, fase, usuarioId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    if (cuadrilla.jefe_id !== usuarioId) {
      throw new Error('Solo el jefe de cuadrilla puede actualizar la fase');
    }

    return CuadrillaRepository.actualizarFase(cuadrillaId, fase);
  }

  // Activo la alerta de emergencia de la cuadrilla; solo el jefe tiene este permiso.
  static async enviarAlertaEmergencia(cuadrillaId, descripcion, usuarioId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    if (cuadrilla.jefe_id !== usuarioId) {
      throw new Error('Solo el jefe de cuadrilla puede enviar alertas');
    }

    return CuadrillaRepository.activarAlerta(cuadrillaId, descripcion);
  }

  // Libero a todos los miembros de la cuadrilla y la marco como completada para cerrar el ciclo.
  static async completarCuadrilla(cuadrillaId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    await MiembroCuadrillaRepository.eliminarTodos(cuadrillaId);
    return CuadrillaRepository.actualizarEstado(cuadrillaId, 'completada');
  }

  // Muevo al voluntario de una cuadrilla a otra: primero lo elimino del origen, luego lo agrego al destino.
  static async reasignarVoluntario(cuadrillaOrigenId, cuadrillaDestinoId, voluntarioId) {
    await this.eliminarMiembro(cuadrillaOrigenId, voluntarioId);
    return this.agregarMiembro(cuadrillaDestinoId, voluntarioId);
  }

  // Obtengo las cuadrillas de una emergencia enriquecidas con su color de estado según el plazo restante.
  static async obtenerCuadrillasConEstado(emergenciaId) {
    return CuadrillaRepository.obtenerConEstado(emergenciaId);
  }

  // Delego al repositorio de herramientas el cálculo del balance (total, buenas, dañadas, perdidas).
  static async obtenerBalanceHerramientas(cuadrillaId) {
    return HerramientaRepository.generarBalance(cuadrillaId);
  }

  // Listo todas las cuadrillas que pertenecen a una emergencia determinada.
  static async listarPorEmergencia(emergenciaId) {
    return CuadrillaRepository.listarPorEmergencia(emergenciaId);
  }
}
