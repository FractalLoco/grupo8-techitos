'use strict';
import AppDataSource from '../config/database.js';
import { ReporteRepository } from '../repositories/reporte.repository.js';
import { generarPdfReporte } from './reporte-pdf.service.js';
import { randomUUID } from 'node:crypto';
import { mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const ESTADOS_CUADRILLA_ACTIVA = new Set(['activa', 'en_progreso']);
const TIPOS_HITO = new Set(['avance', 'finalizado']);
const NO_REGISTRADO = 'No registrado';

const DIRECTORIO_REPORTES = path.resolve(process.cwd(), 'uploads', 'reportes');

const normalizarNombreArchivo = (valor) => {
  const nombre = String(valor || 'emergencia')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return nombre || 'emergencia';
};

const fechaParaNombreArchivo = (fecha) => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago',
  }).formatToParts(fecha);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}_${valor('hour')}-${valor('minute')}-${valor('second')}`;
};

export const crearNombreArchivoReporte = (
  nombreEmergencia,
  fechaGeneracion,
  identificador = randomUUID(),
) => {
  const emergencia = normalizarNombreArchivo(nombreEmergencia);
  const fecha = fechaParaNombreArchivo(fechaGeneracion);
  return `Reporte-${emergencia}-${fecha}-${identificador.slice(0, 8)}.pdf`;
};

export const resolverRutaReporteSegura = (nombreArchivo) => {
  if (
    typeof nombreArchivo !== 'string'
    || path.basename(nombreArchivo) !== nombreArchivo
    || !nombreArchivo.toLowerCase().endsWith('.pdf')
  ) {
    throw new ReporteServiceError('Nombre de archivo de reporte invalido', 400);
  }

  const ruta = path.resolve(DIRECTORIO_REPORTES, nombreArchivo);
  if (path.dirname(ruta) !== DIRECTORIO_REPORTES) {
    throw new ReporteServiceError('Ruta de reporte invalida', 400);
  }
  return ruta;
};

export class ReporteServiceError extends Error {
  constructor(mensaje, statusCode = 400, datos = null) {
    super(mensaje);
    this.name = 'ReporteServiceError';
    this.statusCode = statusCode;
    this.datos = datos;
  }
}

const tieneTexto = (valor) => typeof valor === 'string' && valor.trim().length > 0;
const tieneNumero = (valor) => valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor));
const valorRegistrado = (valor) => (valor === null || valor === undefined || valor === '' ? NO_REGISTRADO : valor);

const agruparPor = (elementos, campo) => {
  const grupos = new Map();
  for (const elemento of elementos) {
    const clave = Number(elemento[campo]);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(elemento);
  }
  return grupos;
};

const calcularBalance = (herramientas) => {
  const balance = {
    total: herramientas.length,
    entregadas: 0,
    buenas: 0,
    danadas: 0,
    perdidas: 0,
    no_devueltas: 0,
  };

  for (const herramienta of herramientas) {
    if (herramienta.estado === 'entregada') balance.entregadas += 1;
    if (herramienta.estado === 'buena') balance.buenas += 1;
    if (herramienta.estado === 'danada') balance.danadas += 1;
    if (herramienta.estado === 'perdida') balance.perdidas += 1;
    if (herramienta.estado === 'no_devuelta') balance.no_devueltas += 1;
  }

  balance.con_diferencias = balance.danadas + balance.perdidas + balance.no_devueltas > 0;
  return balance;
};

const calcularCumplimientoPlazo = (cuadrilla, fechaReferencia) => {
  if (!cuadrilla.fecha_asignacion || !cuadrilla.plazo_dias) return NO_REGISTRADO;

  const fechaAsignacion = new Date(cuadrilla.fecha_asignacion);
  const fechaLimite = new Date(fechaAsignacion.getTime() + Number(cuadrilla.plazo_dias) * 86400000);
  const fechaComparacion = cuadrilla.fecha_completada
    ? new Date(cuadrilla.fecha_completada)
    : fechaReferencia;

  return fechaComparacion <= fechaLimite ? 'en_plazo' : 'atrasado';
};

export const generarAdvertenciasReporte = ({ cuadrillas, familias, obras, herramientas, mensajes }) => {
  const advertencias = [];
  const hitosPorCuadrilla = new Set(
    mensajes
      .filter((mensaje) => TIPOS_HITO.has(mensaje.tipo) && mensaje.cuadrilla_id !== null)
      .map((mensaje) => Number(mensaje.cuadrilla_id)),
  );

  for (const cuadrilla of cuadrillas) {
    if (!cuadrilla.jefe_id) {
      advertencias.push({
        tipo: 'cuadrilla_sin_jefe',
        entidad_id: cuadrilla.id,
        descripcion: `La cuadrilla ${cuadrilla.nombre} no tiene jefe asignado`,
      });
    }
    if (!cuadrilla.obra_asignada_id) {
      advertencias.push({
        tipo: 'cuadrilla_sin_obra',
        entidad_id: cuadrilla.id,
        descripcion: `La cuadrilla ${cuadrilla.nombre} no tiene obra asignada`,
      });
    }
    if (ESTADOS_CUADRILLA_ACTIVA.has(cuadrilla.estado) && !hitosPorCuadrilla.has(Number(cuadrilla.id))) {
      advertencias.push({
        tipo: 'cuadrilla_sin_avance',
        entidad_id: cuadrilla.id,
        descripcion: `La cuadrilla ${cuadrilla.nombre} no registra avances`,
      });
    }
    if (cuadrilla.alerta_emergencia && !tieneTexto(cuadrilla.descripcion_emergencia)) {
      advertencias.push({
        tipo: 'alerta_emergencia_sin_descripcion',
        entidad_id: cuadrilla.id,
        descripcion: `La cuadrilla ${cuadrilla.nombre} tiene una alerta de emergencia sin descripcion`,
      });
    }
    if (cuadrilla.alerta_herramienta && !tieneTexto(cuadrilla.descripcion_alerta_herramienta)) {
      advertencias.push({
        tipo: 'alerta_herramienta_sin_descripcion',
        entidad_id: cuadrilla.id,
        descripcion: `La cuadrilla ${cuadrilla.nombre} tiene una alerta de herramientas sin descripcion`,
      });
    }
  }

  for (const familia of familias) {
    const tieneCoordenadas = tieneNumero(familia.lat) && tieneNumero(familia.lng);
    if (!tieneTexto(familia.direccion) && !tieneCoordenadas) {
      advertencias.push({
        tipo: 'familia_sin_ubicacion',
        entidad_id: familia.id,
        descripcion: `La familia ${familia.nombre_cabeza_familia} no tiene ubicacion registrada`,
      });
    }
  }

  for (const obra of obras) {
    const coordenadasValidas = tieneNumero(obra.lat) && tieneNumero(obra.lng);
    if (!tieneTexto(obra.nombre) || !coordenadasValidas || !tieneTexto(obra.estado)) {
      advertencias.push({
        tipo: 'obra_incompleta',
        entidad_id: obra.id,
        descripcion: `La obra ${obra.nombre || `#${obra.id}`} tiene informacion incompleta`,
      });
    }
  }

  for (const herramienta of herramientas) {
    if (!tieneTexto(herramienta.estado) || herramienta.estado === 'entregada') {
      advertencias.push({
        tipo: 'herramienta_sin_estado_actualizado',
        entidad_id: herramienta.id,
        descripcion: `La herramienta ${herramienta.nombre} aun no tiene un estado de devolucion actualizado`,
      });
    }
  }

  for (const mensaje of mensajes.filter((item) => item.tipo === 'emergencia')) {
    if (!tieneTexto(mensaje.contenido)) {
      advertencias.push({
        tipo: 'incidente_sin_descripcion',
        entidad_id: mensaje.id,
        descripcion: `El incidente #${mensaje.id} no tiene descripcion`,
      });
    }
  }

  return advertencias;
};

export const construirSnapshotReporte = (datos, fechaGeneracion = new Date()) => {
  const { emergencia, cuadrillas, familias, obras, herramientas, miembros, mensajes } = datos;
  const miembrosPorCuadrilla = agruparPor(miembros, 'cuadrilla_id');
  const herramientasPorCuadrilla = agruparPor(herramientas, 'cuadrilla_id');
  const mensajesPorCuadrilla = agruparPor(
    mensajes.filter((mensaje) => mensaje.cuadrilla_id !== null),
    'cuadrilla_id',
  );

  const voluntarios = new Map();
  for (const miembro of miembros) {
    if (miembro.rol === 'voluntario') {
      voluntarios.set(Number(miembro.usuario_id), {
        id: miembro.usuario_id,
        nombre: miembro.usuario_nombre,
      });
    }
  }

  const cuadrillasSnapshot = cuadrillas.map((cuadrilla) => {
    const integrantes = miembrosPorCuadrilla.get(Number(cuadrilla.id)) || [];
    const inventario = herramientasPorCuadrilla.get(Number(cuadrilla.id)) || [];
    const comunicaciones = mensajesPorCuadrilla.get(Number(cuadrilla.id)) || [];

    return {
      id: cuadrilla.id,
      nombre: cuadrilla.nombre,
      estado: cuadrilla.estado,
      fase: valorRegistrado(cuadrilla.fase),
      jefe: cuadrilla.jefe_id
        ? { id: cuadrilla.jefe_id, nombre: cuadrilla.jefe_nombre }
        : NO_REGISTRADO,
      obra_asignada_id: cuadrilla.obra_asignada_id || null,
      plazo_dias: cuadrilla.plazo_dias,
      fecha_asignacion: cuadrilla.fecha_asignacion || NO_REGISTRADO,
      fecha_completada: cuadrilla.fecha_completada || NO_REGISTRADO,
      cumplimiento_plazo: calcularCumplimientoPlazo(cuadrilla, fechaGeneracion),
      integrantes: integrantes.map((integrante) => ({
        id: integrante.usuario_id,
        nombre: integrante.usuario_nombre,
        rol: integrante.rol,
        habilidades: valorRegistrado(integrante.habilidades),
        fecha_asignacion: integrante.fecha_asignacion,
      })),
      balance_herramientas: calcularBalance(inventario),
      herramientas: inventario.map((herramienta) => ({
        id: herramienta.id,
        nombre: herramienta.nombre,
        estado: herramienta.estado,
        observaciones: valorRegistrado(herramienta.observaciones),
      })),
      hitos: comunicaciones
        .filter((mensaje) => TIPOS_HITO.has(mensaje.tipo))
        .map((mensaje) => ({
          id: mensaje.id,
          tipo: mensaje.tipo,
          contenido: valorRegistrado(mensaje.contenido),
          fecha: mensaje.creado_en,
          remitente: mensaje.remitente_nombre,
          archivo_url: mensaje.archivo_url || null,
        })),
      alertas: {
        emergencia: cuadrilla.alerta_emergencia
          ? valorRegistrado(cuadrilla.descripcion_emergencia)
          : null,
        herramientas: cuadrilla.alerta_herramienta
          ? valorRegistrado(cuadrilla.descripcion_alerta_herramienta)
          : null,
      },
    };
  });

  const advertencias = generarAdvertenciasReporte({ cuadrillas, familias, obras, herramientas, mensajes });

  return {
    generado_en: fechaGeneracion.toISOString(),
    emergencia: {
      id: emergencia.id,
      nombre: emergencia.nombre,
      descripcion: valorRegistrado(emergencia.descripcion),
      estado: emergencia.estado,
      ubicacion: {
        direccion: valorRegistrado(emergencia.direccion),
        lat: emergencia.lat ?? NO_REGISTRADO,
        lng: emergencia.lng ?? NO_REGISTRADO,
      },
      fecha_inicio: emergencia.fecha_inicio,
      fecha_fin: emergencia.fecha_fin || NO_REGISTRADO,
    },
    indicadores: {
      obras_finalizadas: obras.filter((obra) => obra.estado === 'completada').length,
      familias_registradas: familias.length,
      personas_beneficiadas: familias.reduce((total, familia) => total + Number(familia.miembros || 0), 0),
      cuadrillas_desplegadas: cuadrillas.length,
      voluntarios_desplegados: voluntarios.size,
    },
    cuadrillas: cuadrillasSnapshot,
    familias: familias.map((familia) => ({
      id: familia.id,
      responsable: familia.nombre_cabeza_familia,
      miembros: familia.miembros,
      prioridad: familia.prioridad,
      ubicacion: {
        direccion: valorRegistrado(familia.direccion),
        lat: familia.lat ?? NO_REGISTRADO,
        lng: familia.lng ?? NO_REGISTRADO,
      },
    })),
    obras: obras.map((obra) => ({
      id: obra.id,
      nombre: obra.nombre,
      descripcion: valorRegistrado(obra.descripcion),
      estado: obra.estado,
      direccion: valorRegistrado(obra.direccion),
      lat: obra.lat,
      lng: obra.lng,
      fecha_creacion: obra.fecha_creacion,
    })),
    incidentes: mensajes
      .filter((mensaje) => mensaje.tipo === 'emergencia')
      .map((mensaje) => ({
        id: mensaje.id,
        cuadrilla_id: mensaje.cuadrilla_id,
        descripcion: valorRegistrado(mensaje.contenido),
        fecha: mensaje.creado_en,
        remitente: mensaje.remitente_nombre,
        archivo_url: mensaje.archivo_url || null,
      })),
    voluntarios: [...voluntarios.values()],
    advertencias,
  };
};

export class ReporteService {
  static async obtenerDatosOperativos(emergenciaId) {
    const id = Number(emergenciaId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ReporteServiceError('El ID de la emergencia no es valido', 400);
    }

    const emergencia = await AppDataSource.getRepository('Emergencia').findOne({ where: { id } });
    if (!emergencia) throw new ReporteServiceError('Emergencia no encontrada', 404);

    const [cuadrillas, familias, obras, herramientas, miembros, mensajes] = await Promise.all([
      AppDataSource.query(
        `SELECT c.*, j.nombre AS jefe_nombre
         FROM cuadrillas c
         LEFT JOIN usuarios j ON j.id = c.jefe_id
         WHERE c.emergencia_id = $1
         ORDER BY c.id`,
        [id],
      ),
      AppDataSource.query('SELECT * FROM familias WHERE emergencia_id = $1 ORDER BY id', [id]),
      AppDataSource.query('SELECT * FROM obras WHERE emergencia_id = $1 ORDER BY id', [id]),
      AppDataSource.query(
        `SELECT h.*
         FROM herramientas h
         JOIN cuadrillas c ON c.id = h.cuadrilla_id
         WHERE c.emergencia_id = $1
         ORDER BY h.cuadrilla_id, h.id`,
        [id],
      ),
      AppDataSource.query(
        `SELECT mc.*, u.id AS usuario_id, u.nombre AS usuario_nombre, u.rol
         FROM miembros_cuadrilla mc
         JOIN usuarios u ON u.id = mc.voluntario_id
         JOIN cuadrillas c ON c.id = mc.cuadrilla_id
         WHERE c.emergencia_id = $1
         ORDER BY mc.cuadrilla_id, u.nombre`,
        [id],
      ),
      AppDataSource.query(
        `SELECT m.*, u.nombre AS remitente_nombre
         FROM mensajes m
         JOIN usuarios u ON u.id = m.remitente_id
         LEFT JOIN cuadrillas c ON c.id = m.cuadrilla_id
         WHERE (c.emergencia_id = $1 OR m.cuadrilla_id IS NULL)
           AND m.tipo IN ('avance', 'finalizado', 'emergencia')
         ORDER BY m.creado_en`,
        [id],
      ),
    ]);

    return { emergencia, cuadrillas, familias, obras, herramientas, miembros, mensajes };
  }

  static async validarEmergencia(emergenciaId) {
    const datos = await this.obtenerDatosOperativos(emergenciaId);
    const advertencias = generarAdvertenciasReporte(datos);
    return { completo: advertencias.length === 0, advertencias };
  }

  static async construirSnapshot(emergenciaId, fechaGeneracion = new Date()) {
    const datos = await this.obtenerDatosOperativos(emergenciaId);
    return construirSnapshotReporte(datos, fechaGeneracion);
  }

  static async generarReporte(emergenciaId, usuarioId, confirmarConAdvertencias = false) {
    const snapshot = await this.construirSnapshot(emergenciaId);
    if (snapshot.advertencias.length > 0 && confirmarConAdvertencias !== true) {
      throw new ReporteServiceError(
        'La emergencia tiene advertencias pendientes de confirmacion',
        409,
        { advertencias: snapshot.advertencias },
      );
    }

    const idEmergencia = Number(emergenciaId);
    const nombreArchivo = crearNombreArchivoReporte(
      snapshot.emergencia.nombre,
      new Date(snapshot.generado_en),
    );
    const rutaArchivo = path.join(DIRECTORIO_REPORTES, nombreArchivo);
    const archivoUrl = `/uploads/reportes/${nombreArchivo}`;

    await mkdir(DIRECTORIO_REPORTES, { recursive: true });
    try {
      await generarPdfReporte(snapshot, rutaArchivo);
      const reporte = await ReporteRepository.crear({
        emergencia_id: idEmergencia,
        generado_por: Number(usuarioId),
        nombre_archivo: nombreArchivo,
        archivo_url: archivoUrl,
        datos_snapshot: snapshot,
      });

      return {
        id: reporte.id,
        emergencia_id: reporte.emergencia_id,
        nombre_archivo: reporte.nombre_archivo,
        archivo_url: reporte.archivo_url,
        generado_en: reporte.generado_en,
        datos_snapshot: snapshot,
        advertencias: snapshot.advertencias,
      };
    } catch (error) {
      await unlink(rutaArchivo).catch(() => {});
      if (error instanceof ReporteServiceError) throw error;
      throw new ReporteServiceError('No se pudo generar el reporte PDF', 500);
    }
  }

  static reporteListadoDTO(reporte) {
    return {
      id: reporte.id,
      emergencia_id: reporte.emergencia_id,
      emergencia: reporte.emergencia
        ? { id: reporte.emergencia.id, nombre: reporte.emergencia.nombre, estado: reporte.emergencia.estado }
        : null,
      generado_por: reporte.generadoPor
        ? { id: reporte.generadoPor.id, nombre: reporte.generadoPor.nombre, rol: reporte.generadoPor.rol }
        : null,
      nombre_archivo: reporte.nombre_archivo,
      generado_en: reporte.generado_en,
    };
  }

  static async listarReportes(emergenciaId = null) {
    let reportes;
    if (emergenciaId !== null && emergenciaId !== undefined && emergenciaId !== '') {
      const id = Number(emergenciaId);
      if (!Number.isInteger(id) || id <= 0) {
        throw new ReporteServiceError('El ID de la emergencia no es valido', 400);
      }
      reportes = await ReporteRepository.listarPorEmergencia(id);
    } else {
      reportes = await ReporteRepository.listarTodos();
    }
    return reportes.map((reporte) => this.reporteListadoDTO(reporte));
  }

  static async obtenerDetalleReporte(reporteId) {
    const id = Number(reporteId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ReporteServiceError('El ID del reporte no es valido', 400);
    }
    const reporte = await ReporteRepository.buscarPorId(id);
    if (!reporte) throw new ReporteServiceError('Reporte no encontrado', 404);

    return {
      ...this.reporteListadoDTO(reporte),
      datos_snapshot: reporte.datos_snapshot,
    };
  }

  static async obtenerArchivoReporte(reporteId) {
    const id = Number(reporteId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ReporteServiceError('El ID del reporte no es valido', 400);
    }
    const reporte = await ReporteRepository.buscarPorId(id);
    if (!reporte) throw new ReporteServiceError('Reporte no encontrado', 404);

    const ruta = resolverRutaReporteSegura(reporte.nombre_archivo);
    try {
      const informacion = await stat(ruta);
      if (!informacion.isFile()) throw new Error('No es un archivo');
    } catch {
      throw new ReporteServiceError('El archivo del reporte no existe', 404);
    }

    return { ruta, nombreArchivo: reporte.nombre_archivo };
  }
}
