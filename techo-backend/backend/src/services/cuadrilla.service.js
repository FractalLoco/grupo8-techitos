'use strict';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { HerramientaRepository } from '../repositories/herramienta.repository.js';
import { FamiliaRepository } from '../repositories/familia.repository.js';
import { ObraRepository } from '../repositories/obra.repository.js';
import { NotificacionService } from '../services/notificacion.service.js';

const MIN_MIEMBROS = 10;
const MAX_MIEMBROS = 11;
const PLAZOS_VALIDOS = [2, 5];

export class CuadrillaService {
  // Valido emergencia activa, que tenga familias registradas, plazo correcto y jefe con rol válido
  static async crearCuadrilla(datos) {
    const plazoDias = Number(datos.plazo_dias) || 5;
    if (!PLAZOS_VALIDOS.includes(plazoDias)) {
      throw new Error(`El plazo de entrega debe ser de ${PLAZOS_VALIDOS.join(' o ')} días según la magnitud del trabajo`);
    }

    const emergencia = await EmergenciaRepository.buscarPorId(datos.emergencia_id);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }
    if (emergencia.estado !== 'activa') {
      throw new Error('La emergencia seleccionada no está activa');
    }

    // La emergencia debe tener al menos una familia registrada antes de crear cuadrillas
    const cantidadFamilias = await FamiliaRepository.contarPorEmergencia(datos.emergencia_id);
    if (cantidadFamilias === 0) {
      throw new Error('La emergencia debe tener al menos una familia registrada antes de crear cuadrillas');
    }

    const jefe = await UsuarioRepository.buscarPorId(datos.jefe_id);
    if (!jefe || jefe.rol !== 'jefe_cuadrilla') {
      throw new Error('El jefe de cuadrilla debe ser un usuario con rol jefe_cuadrilla');
    }
    if (!jefe.activo) {
      throw new Error('El jefe de cuadrilla debe tener cuenta activa');
    }

    return CuadrillaRepository.crear({
      nombre: datos.nombre,
      jefe_id: datos.jefe_id,
      emergencia_id: datos.emergencia_id,
      plazo_dias: plazoDias,
    });
  }

  // Agrego un voluntario comprobando el límite máximo, que esté activo y que no pertenezca ya a otra cuadrilla
  static async agregarMiembro(cuadrillaId, voluntarioId, habilidades = null) {
    const miembrosActuales = await MiembroCuadrillaRepository.contar(cuadrillaId);

    if (miembrosActuales >= MAX_MIEMBROS) {
      throw new Error(`La cuadrilla ya tiene el máximo de ${MAX_MIEMBROS} integrantes. Corrija la cantidad antes de continuar`);
    }

    const voluntario = await UsuarioRepository.buscarPorId(voluntarioId);
    if (!voluntario || !voluntario.activo) {
      throw new Error('El voluntario no está disponible');
    }

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

  // Elimino un miembro solo si la cuadrilla conserva el mínimo requerido de 10 integrantes
  static async eliminarMiembro(cuadrillaId, voluntarioId) {
    const miembrosActuales = await MiembroCuadrillaRepository.contar(cuadrillaId);

    if (miembrosActuales <= MIN_MIEMBROS) {
      throw new Error(`La cuadrilla debe tener al menos ${MIN_MIEMBROS} integrantes`);
    }

    return MiembroCuadrillaRepository.eliminar(cuadrillaId, voluntarioId);
  }

  // Asigno la obra validando que pertenezca a la misma emergencia y notifico a todos los integrantes
  static async asignarObra(cuadrillaId, obraId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    const obra = await ObraRepository.buscarPorId(obraId);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    if (obra.emergencia_id !== cuadrilla.emergencia_id) {
      throw new Error('La obra no pertenece a la emergencia de esta cuadrilla');
    }

    const cuadrillaActualizada = await CuadrillaRepository.asignarObra(cuadrillaId, obraId);
    await ObraRepository.actualizar(obraId, { estado: 'asignada' });

    // Notificación con la ubicación exacta y el plazo para jefe y todos los integrantes
    const titulo = `Obra asignada: ${obra.nombre}`;
    const mensaje = `Tu cuadrilla ha sido asignada a la obra "${obra.nombre}". Ubicación: lat ${obra.lat}, lng ${obra.lng}. Plazo de entrega: ${cuadrillaActualizada.plazo_dias} días.`;

    await NotificacionService.crearNotificacion(cuadrilla.jefe_id, titulo, mensaje, 'asignacion_obra', obra.id);
    await NotificacionService.notificarCuadrilla(cuadrillaId, titulo, mensaje, 'asignacion_obra', obra.id);

    return cuadrillaActualizada;
  }

  // Solo el jefe de la propia cuadrilla puede cambiar su fase; verifico el ID del usuario autenticado
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

  // Activo la alerta y notifico inmediatamente a todos los coordinadores con la ubicación de la obra
  static async enviarAlertaEmergencia(cuadrillaId, descripcion, usuarioId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    if (cuadrilla.jefe_id !== usuarioId) {
      throw new Error('Solo el jefe de cuadrilla puede enviar alertas');
    }

    const cuadrillaActualizada = await CuadrillaRepository.activarAlerta(cuadrillaId, descripcion);

    // Incluyo coordenadas de la obra en la notificación si la cuadrilla tiene una asignada
    let ubicacion = 'Sin obra asignada aún';
    if (cuadrilla.obra_asignada_id) {
      const obra = await ObraRepository.buscarPorId(cuadrilla.obra_asignada_id);
      if (obra) {
        ubicacion = `lat ${obra.lat}, lng ${obra.lng}`;
      }
    }

    const coordinadores = await UsuarioRepository.buscarPorRol('coordinador');
    const titulo = `Alerta de emergencia: cuadrilla "${cuadrilla.nombre}"`;
    const mensaje = `${descripcion}. Ubicación: ${ubicacion}.`;

    await Promise.all(
      coordinadores.map((c) =>
        NotificacionService.crearNotificacion(c.id, titulo, mensaje, 'alerta_emergencia', cuadrillaId)
      )
    );

    return cuadrillaActualizada;
  }

  // Completo la cuadrilla: limpio alertas, actualizo la obra y libero a los voluntarios
  static async completarCuadrilla(cuadrillaId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    const herramientas = await HerramientaRepository.listarPorCuadrilla(cuadrillaId);
    const sinClasificar = herramientas.filter((h) => h.estado === 'entregada').length;
    if (sinClasificar > 0) {
      throw new Error(`Hay ${sinClasificar} herramienta(s) sin clasificar. Cierra el balance antes de completar la cuadrilla.`);
    }
    if (cuadrilla.alerta_herramienta) {
      throw new Error('Hay una alerta de herramientas activa. Resuelve las diferencias antes de completar la cuadrilla.');
    }

    if (cuadrilla.obra_asignada_id) {
      await ObraRepository.actualizar(cuadrilla.obra_asignada_id, { estado: 'completada' });
    }

    await MiembroCuadrillaRepository.eliminarTodos(cuadrillaId);

    return CuadrillaRepository.actualizar(cuadrillaId, {
      estado: 'completada',
      fecha_completada: new Date(),
      alerta_emergencia: false,
      descripcion_emergencia: null,
      alerta_herramienta: false,
      descripcion_alerta_herramienta: null,
    });
  }

  // Muevo al voluntario de una cuadrilla a otra y le notifico su nueva asignación
  static async reasignarVoluntario(cuadrillaOrigenId, cuadrillaDestinoId, voluntarioId) {
    const cuadrillaDestino = await CuadrillaRepository.buscarPorId(cuadrillaDestinoId);
    if (!cuadrillaDestino) {
      throw new Error('Cuadrilla destino no encontrada');
    }

    await this.eliminarMiembro(cuadrillaOrigenId, voluntarioId);
    const resultado = await this.agregarMiembro(cuadrillaDestinoId, voluntarioId);

    await NotificacionService.crearNotificacion(
      Number(voluntarioId),
      'Has sido reasignado',
      `Has sido reasignado a la cuadrilla "${cuadrillaDestino.nombre}".`,
      'reasignacion',
      cuadrillaDestinoId
    );

    return resultado;
  }

  // Obtengo las cuadrillas de una emergencia enriquecidas con color de estado y opcionalmente filtradas
  static async obtenerCuadrillasConEstado(emergenciaId, filtroColor = null) {
    const cuadrillas = await CuadrillaRepository.obtenerConEstado(emergenciaId);
    if (filtroColor) {
      return cuadrillas.filter((c) => c.estadoColor === filtroColor);
    }
    return cuadrillas;
  }

  // Obtengo todas las cuadrillas del sistema con su estado (vista global, sin filtrar por emergencia)
  static async obtenerTodasConEstado(filtroColor = null) {
    const cuadrillas = await CuadrillaRepository.obtenerTodasConEstado();
    if (filtroColor) {
      return cuadrillas.filter((c) => c.estadoColor === filtroColor);
    }
    return cuadrillas;
  }

  // Delego al repositorio de herramientas el cálculo del balance (total, buenas, dañadas, perdidas)
  static async obtenerBalanceHerramientas(cuadrillaId) {
    return HerramientaRepository.generarBalance(cuadrillaId);
  }

  // Listo todas las cuadrillas que pertenecen a una emergencia determinada
  static async listarPorEmergencia(emergenciaId) {
    return CuadrillaRepository.listarPorEmergencia(emergenciaId);
  }
}
