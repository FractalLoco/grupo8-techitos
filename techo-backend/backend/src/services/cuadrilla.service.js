'use strict';
import { CuadrillaRepository } from '../repositories/cuadrilla.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';
import { UsuarioRepository } from '../repositories/usuario.repository.js';
import { HerramientaRepository } from '../repositories/herramienta.repository.js';
import { FamiliaRepository } from '../repositories/familia.repository.js';
import { ObraRepository } from '../repositories/obra.repository.js';
import { NotificacionService } from '../services/notificacion.service.js';
import { MovimientoHerramientaService } from '../services/movimiento-herramienta.service.js';
import AppDataSource from '../config/database.js';

const MIN_MIEMBROS = 10;
const MAX_MIEMBROS = 10;
const PLAZOS_VALIDOS = [2, 5];
const FASES_VALIDAS = ['limpieza', 'montaje', 'terminaciones'];

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

  // Elimino un miembro conservando el mínimo de 10, salvo que sea parte de un movimiento
  // entre cuadrillas (reasignación), donde el voluntario no se pierde: solo cambia de equipo.
  static async eliminarMiembro(cuadrillaId, voluntarioId, { permitirBajoMinimo = false } = {}) {
    const miembrosActuales = await MiembroCuadrillaRepository.contar(cuadrillaId);

    if (!permitirBajoMinimo && miembrosActuales <= MIN_MIEMBROS) {
      throw new Error(`La cuadrilla debe tener al menos ${MIN_MIEMBROS} integrantes`);
    }

    return MiembroCuadrillaRepository.eliminar(cuadrillaId, voluntarioId);
  }

  // Asigno una obra de forma consistente: misma emergencia, equipo completo,
  // cuadrilla sin otra obra y obra no ocupada por otro equipo. Las notificaciones
  // son posteriores a la asignación y nunca revierten una operación ya guardada.
  static async asignarObra(cuadrillaId, obraId) {
    const cuadrillaIdNumero = Number(cuadrillaId);
    const obraIdNumero = Number(obraId);

    if (!Number.isInteger(cuadrillaIdNumero) || !Number.isInteger(obraIdNumero)) {
      throw new Error('Cuadrilla u obra inválida');
    }

    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaIdNumero);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }
    if (cuadrilla.estado === 'completada' || cuadrilla.estado === 'desarmada') {
      throw new Error('No se puede asignar una obra a una cuadrilla terminada');
    }

    const miembrosActuales = await CuadrillaRepository.contarMiembros(cuadrillaIdNumero);
    if (miembrosActuales < MIN_MIEMBROS) {
      throw new Error(`La cuadrilla necesita al menos ${MIN_MIEMBROS} integrantes antes de recibir una obra`);
    }

    const obra = await ObraRepository.buscarPorId(obraIdNumero);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    if (Number(obra.emergencia_id) !== Number(cuadrilla.emergencia_id)) {
      throw new Error('La obra no pertenece a la emergencia de esta cuadrilla');
    }
    if (obra.estado === 'completada') {
      throw new Error('La obra ya está completada y no puede volver a asignarse');
    }

    const cuadrillaQueOcupaLaObra = await CuadrillaRepository.buscarPorObraAsignada(obraIdNumero);
    if (cuadrillaQueOcupaLaObra && cuadrillaQueOcupaLaObra.id !== cuadrillaIdNumero) {
      throw new Error(`La obra ya está asignada a la cuadrilla "${cuadrillaQueOcupaLaObra.nombre}"`);
    }

    if (cuadrilla.obra_asignada_id && Number(cuadrilla.obra_asignada_id) !== obraIdNumero) {
      throw new Error('La cuadrilla ya tiene una obra asignada. Completa esa obra antes de asignar otra');
    }

    // Si ya existe exactamente la misma relación, la operación es idempotente.
    if (Number(cuadrilla.obra_asignada_id) === obraIdNumero) {
      return cuadrilla;
    }

    // Cuadrilla y obra cambian dentro de la misma transacción para no dejar una
    // relación a medias si PostgreSQL rechaza alguna actualización.
    await AppDataSource.transaction(async (manager) => {
      await manager.getRepository('Cuadrilla').update(cuadrillaIdNumero, {
        obra_asignada_id: obraIdNumero,
        fecha_asignacion: new Date(),
      });
      await manager.getRepository('Obra').update(obraIdNumero, { estado: 'asignada' });
    });

    const cuadrillaActualizada = await CuadrillaRepository.buscarPorId(cuadrillaIdNumero);

    // Notificación con dirección legible cuando existe. Un fallo del módulo de
    // notificaciones no debe hacer creer al frontend que la asignación fracasó.
    const titulo = `Obra asignada: ${obra.nombre}`;
    const ubicacion = obra.direccion || `lat ${obra.lat}, lng ${obra.lng}`;
    const mensaje = `Tu cuadrilla ha sido asignada a la obra "${obra.nombre}". Ubicación: ${ubicacion}. Plazo de entrega: ${cuadrillaActualizada.plazo_dias} días.`;

    await Promise.allSettled([
      NotificacionService.crearNotificacion(cuadrilla.jefe_id, titulo, mensaje, 'asignacion_obra', obra.id),
      NotificacionService.notificarCuadrilla(cuadrillaIdNumero, titulo, mensaje, 'asignacion_obra', obra.id),
    ]);

    return cuadrillaActualizada;
  }

  // Avanza la fase de trabajo. El jefe solo puede tocar su propia cuadrilla; el coordinador
  // puede gestionar cualquiera. Valido que exista obra asignada y que la fase sea válida.
  static async actualizarFase(cuadrillaId, fase, usuarioId, rol = null) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) {
      throw new Error('Cuadrilla no encontrada');
    }

    if (rol !== 'coordinador' && cuadrilla.jefe_id !== usuarioId) {
      throw new Error('Solo el jefe de cuadrilla o el coordinador pueden actualizar la fase');
    }

    if (!FASES_VALIDAS.includes(fase)) {
      throw new Error(`Fase inválida. Debe ser una de: ${FASES_VALIDAS.join(', ')}`);
    }

    if (!cuadrilla.obra_asignada_id) {
      throw new Error('La cuadrilla no tiene una obra asignada; asigna una obra antes de iniciar el trabajo');
    }

    if (cuadrilla.estado === 'completada' || cuadrilla.estado === 'desarmada') {
      throw new Error('La cuadrilla ya fue completada; no se puede cambiar su fase');
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

  // Devuelve al inventario (almacén) las herramientas reutilizables de una obra terminada.
  // Solo las que quedaron en buen estado ('buena' o 'entregada') vuelven como stock disponible;
  // las dañadas/perdidas/no devueltas se conservan solo como historial.
  static async devolverHerramientas(cuadrillaId, usuarioId) {
    const cuadrilla = await CuadrillaRepository.buscarPorId(cuadrillaId);
    if (!cuadrilla) throw new Error('Cuadrilla no encontrada');
    if (cuadrilla.estado !== 'completada' && cuadrilla.estado !== 'desarmada') {
      throw new Error('Solo se pueden devolver herramientas de cuadrillas terminadas');
    }
    if (cuadrilla.herramientas_devueltas) {
      throw new Error('Las herramientas de esta cuadrilla ya fueron devueltas al inventario');
    }

    const herramientas = await HerramientaRepository.listarPorCuadrilla(cuadrillaId);
    // El material es consumible: su salida ya se registró y no vuelve al almacén.
    // Solo se devuelven herramientas/EPP en buen estado.
    const reutilizables = herramientas.filter((h) =>
      (h.estado === 'buena' || h.estado === 'entregada') && (h.tipo_item || 'herramienta') !== 'material'
    );

    // Agrupa por nombre + tipo para devolver el stock consolidado
    const grupos = {};
    for (const h of reutilizables) {
      const tipo = h.tipo_item || 'herramienta';
      const key = `${h.nombre.toLowerCase()}__${tipo}`;
      if (!grupos[key]) grupos[key] = { nombre_item: h.nombre, tipo_item: tipo, cantidad: 0 };
      grupos[key].cantidad += 1;
    }

    const devueltos = Object.values(grupos);
    for (const g of devueltos) {
      await MovimientoHerramientaService.registrarStockEntrada(
        {
          nombre_item: g.nombre_item,
          cantidad: g.cantidad,
          tipo_item: g.tipo_item,
          observaciones: `Devolución de obra terminada — cuadrilla "${cuadrilla.nombre}"`,
        },
        usuarioId,
      );
    }

    await CuadrillaRepository.actualizar(cuadrillaId, { herramientas_devueltas: true });

    const totalDevuelto = devueltos.reduce((s, g) => s + g.cantidad, 0);
    return { devueltos, totalDevuelto, itemsDistintos: devueltos.length };
  }

  // Muevo al voluntario de una cuadrilla a otra y le notifico su nueva asignación
  static async reasignarVoluntario(cuadrillaOrigenId, cuadrillaDestinoId, voluntarioId) {
    const cuadrillaDestino = await CuadrillaRepository.buscarPorId(cuadrillaDestinoId);
    if (!cuadrillaDestino) {
      throw new Error('Cuadrilla destino no encontrada');
    }

    // El movimiento es independiente del mínimo en la cuadrilla de origen (el voluntario
    // no se pierde, cambia de equipo); el destino sí respeta el tope máximo de integrantes.
    await this.eliminarMiembro(cuadrillaOrigenId, voluntarioId, { permitirBajoMinimo: true });
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
