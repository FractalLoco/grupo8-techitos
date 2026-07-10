'use strict';
import { NotificacionRepository } from '../repositories/notificacion.repository.js';
import { MiembroCuadrillaRepository } from '../repositories/miembro-cuadrilla.repository.js';

export class NotificacionService {
  // Se avisa a un usuario puntual con el título y mensaje que se le pase
  static async crearNotificacion(usuarioId, titulo, mensaje, tipo, referenciaId = null, cuadrillaId = null) {
    return NotificacionRepository.crear({
      usuario_id: Number(usuarioId),
      titulo,
      mensaje,
      tipo,
      referencia_id: referenciaId,
      cuadrilla_id: cuadrillaId,
    });
  }

  // Avisa a todos los coordinadores activos cuando una persona completa
  // el registro público como voluntario o jefe de cuadrilla.
  // Uso allSettled para que un problema aislado al guardar un aviso no cancele
  // el registro que ya fue creado correctamente.
  static async notificarNuevoRegistro(usuario) {
    const coordinadores = await NotificacionRepository.listarCoordinadoresActivos();
    if (!coordinadores.length) {
      return { creadas: 0, fallidas: 0 };
    }

    const rolLegible = usuario.rol === 'jefe_cuadrilla'
      ? 'jefe de cuadrilla'
      : 'voluntario';

    const titulo = usuario.rol === 'jefe_cuadrilla'
      ? 'Nuevo registro de jefe de cuadrilla'
      : 'Nuevo registro de voluntario';

    const mensaje = `${usuario.nombre} se registró como ${rolLegible}. `
      + 'La cuenta está pendiente de activación. Revisa Gestión de Usuarios.';

    const resultados = await Promise.allSettled(
      coordinadores.map((coordinadorId) => NotificacionRepository.crear({
        usuario_id: coordinadorId,
        titulo,
        mensaje,
        tipo: 'registro_usuario',
        referencia_id: usuario.id,
        cuadrilla_id: null,
        leida: false,
      }))
    );

    return {
      creadas: resultados.filter((resultado) => resultado.status === 'fulfilled').length,
      fallidas: resultados.filter((resultado) => resultado.status === 'rejected').length,
    };
  }

  // Se avisa a todos los integrantes de la cuadrilla al mismo tiempo
  static async notificarCuadrilla(cuadrillaId, titulo, mensaje, tipo, referenciaId = null) {
    const miembros = await MiembroCuadrillaRepository.listarPorCuadrilla(cuadrillaId);
    return Promise.all(
      miembros.map((m) =>
        NotificacionRepository.crear({
          usuario_id: m.voluntario_id,
          titulo,
          mensaje,
          tipo,
          referencia_id: referenciaId,
        })
      )
    );
  }

  // Crea notificaciones en lote usando un queryRunner (transaccional)
  static async crearNotificacionesLote(listaNotificaciones, queryRunner) {
    if (!listaNotificaciones.length) return [];
    return NotificacionRepository.crearMuchasConQueryRunner(listaNotificaciones, queryRunner);
  }

  // Prepara la lista de notificaciones para broadcast a todos los activos excepto el remitente
  static prepararNotificacionesBroadcast(remitenteId, mensajeId, contenido) {
    return async (queryRunner) => {
      const ids = await NotificacionRepository.listarUsuariosActivos();
      const destinatarios = ids.filter((id) => id !== remitenteId);
      if (!destinatarios.length) return [];

      const lista = destinatarios.map((usuarioId) => ({
        usuario_id: usuarioId,
        titulo: 'Nuevo aviso general',
        mensaje: contenido || 'Mensaje general del coordinador',
        tipo: 'broadcast',
        referencia_id: mensajeId,
        cuadrilla_id: null,
        leida: false,
      }));

      return NotificacionRepository.crearMuchasConQueryRunner(lista, queryRunner);
    };
  }

  // Prepara notificación de alerta de emergencia para todos los coordinadores activos excepto el remitente
  // Las alertas llegan a la central y a los voluntarios de la cuadrilla afectada.
  static prepararNotificacionesAlerta(remitenteId, mensajeId, nombreCuadrilla, descripcion, cuadrillaId) {
    return async (queryRunner) => {
      const [idsCoordinadores, idsVoluntarios] = await Promise.all([
        NotificacionRepository.listarCoordinadoresActivos(),
        NotificacionRepository.listarVoluntariosCuadrilla(cuadrillaId),
      ]);
      const destinatarios = [...new Set([...idsCoordinadores, ...idsVoluntarios])]
        .filter((id) => id !== remitenteId);
      if (!destinatarios.length) return [];

      const contenido = `[${nombreCuadrilla}] ${descripcion || 'Alerta de emergencia'}`;

      const lista = destinatarios.map((usuarioId) => ({
        usuario_id: usuarioId,
        titulo: 'Alerta de emergencia',
        mensaje: contenido,
        tipo: 'alerta_emergencia',
        referencia_id: mensajeId,
        cuadrilla_id: cuadrillaId,
        leida: false,
      }));

      return NotificacionRepository.crearMuchasConQueryRunner(lista, queryRunner);
    };
  }

  // Prepara notificaciones de mensaje privado de cuadrilla (a integrantes + jefe)
  // Si el remitente es un integrante (no coordinador), también notifica a coordinadores activos
  // Los mensajes operativos llegan al jefe y a la central, no a voluntarios.
  static prepararNotificacionesMensajeCuadrilla(
    remitenteId,
    mensajeId,
    contenido,
    cuadrillaId,
    esCoordinador,
    tipoMensaje = 'texto',
    nombreCuadrilla = 'Cuadrilla',
  ) {
    return async (queryRunner) => {
      const jefeId = await NotificacionRepository.obtenerJefeCuadrilla(cuadrillaId);
      const destinatarios = [];
      if (jefeId && jefeId !== remitenteId) {
        destinatarios.push(jefeId);
      }

      // Si el remitente no es coordinador, también notificar a coordinadores activos
      if (!esCoordinador) {
        const idsCoord = await NotificacionRepository.listarCoordinadoresActivos();
        for (const id of idsCoord) {
          if (id !== remitenteId && !destinatarios.includes(id)) {
            destinatarios.push(id);
          }
        }
      }

      if (!destinatarios.length) return [];

      const detalle = contenido?.trim() || 'Sin comentario adicional';
      const textosPorTipo = {
        avance: {
          titulo: `Avance registrado en ${nombreCuadrilla}`,
          mensaje: `La cuadrilla ${nombreCuadrilla} registro un avance: ${detalle}`,
        },
        finalizado: {
          titulo: `Finalizacion registrada en ${nombreCuadrilla}`,
          mensaje: `La cuadrilla ${nombreCuadrilla} informo que finalizo su trabajo: ${detalle}`,
        },
        imagen: {
          titulo: `Nueva foto de avance en ${nombreCuadrilla}`,
          mensaje: `La cuadrilla ${nombreCuadrilla} envio una fotografia: ${detalle}`,
        },
      };
      const textoNotificacion = textosPorTipo[tipoMensaje] || {
        titulo: `Nuevo mensaje de ${nombreCuadrilla}`,
        mensaje: detalle,
      };

      const lista = destinatarios.map((usuarioId) => ({
        usuario_id: usuarioId,
        titulo: textoNotificacion.titulo,
        mensaje: textoNotificacion.mensaje,
        tipo: 'mensaje_cuadrilla',
        referencia_id: mensajeId,
        cuadrilla_id: cuadrillaId,
        leida: false,
      }));

      return NotificacionRepository.crearMuchasConQueryRunner(lista, queryRunner);
    };
  }

  // Se traen todas las notificaciones del usuario, las más recientes primero
  static async listarPorUsuario(usuarioId) {
    return NotificacionRepository.listarPorUsuario(usuarioId);
  }

  // Se cuentan las no leídas para mostrar el número en el ícono de campana
  static async contarNoLeidas(usuarioId) {
    return NotificacionRepository.contarNoLeidas(usuarioId);
  }

  // Se marca como leída, pero solo si le pertenece al usuario que la pide
  static async marcarLeida(id, usuarioId) {
    const notificacion = await NotificacionRepository.marcarLeida(id, usuarioId);
    if (!notificacion) {
      throw new Error('Notificación no encontrada');
    }
    return notificacion;
  }

  // Se limpian todas las notificaciones del usuario de una sola vez
  static async marcarTodasLeidas(usuarioId) {
    return NotificacionRepository.marcarTodasLeidas(usuarioId);
  }
}
