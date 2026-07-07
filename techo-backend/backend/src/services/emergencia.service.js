'use strict';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';
import { FamiliaRepository } from '../repositories/familia.repository.js';
import { EvaluacionRepository } from '../repositories/evaluacion.repository.js';
import { AuditoriaService } from './auditoria.service.js';

const CAMPOS_AUDITABLES = [
  'nombre',
  'descripcion',
  'direccion',
  'lat',
  'lng',
  'estado',
  'fecha_fin',
];

export class EmergenciaService {
  static async crearEmergencia(datos, actor = null) {
    const emergencia = await EmergenciaRepository.crear(datos);

    await AuditoriaService.registrarSeguro({
      modulo: 'emergencias',
      accion: 'CREAR_EMERGENCIA',
      entidadId: emergencia.id,
      entidadNombre: emergencia.nombre,
      actor,
      descripcion: `Se creó la emergencia ${emergencia.nombre}.`,
      detalles: {
        descripcion: emergencia.descripcion,
        direccion: emergencia.direccion,
        lat: emergencia.lat,
        lng: emergencia.lng,
        estado: emergencia.estado,
      },
    });

    return emergencia;
  }

  static async actualizarEmergencia(id, datos, actor = null) {
    const emergenciaAntes = await EmergenciaRepository.buscarPorId(id);

    if (!emergenciaAntes) {
      throw new Error('Emergencia no encontrada');
    }

    if (emergenciaAntes.estado === 'finalizada') {
      throw new Error('No se puede modificar una emergencia finalizada');
    }

    const emergencia = await EmergenciaRepository.actualizar(id, datos);
    const cambios = AuditoriaService.calcularCambios(
      emergenciaAntes,
      emergencia,
      CAMPOS_AUDITABLES
    );

    await AuditoriaService.registrarSeguro({
      modulo: 'emergencias',
      accion: 'ACTUALIZAR_EMERGENCIA',
      entidadId: emergencia.id,
      entidadNombre: emergencia.nombre,
      actor,
      descripcion: `Se actualizaron los datos de la emergencia ${emergencia.nombre}.`,
      detalles: { cambios },
    });

    return emergencia;
  }

  static async listarActivas() {
    return EmergenciaRepository.listarActivas();
  }

  static async listarTodas() {
    return EmergenciaRepository.listarTodas();
  }

  static async obtenerDetalle(id) {
    const emergencia = await EmergenciaRepository.buscarPorId(id);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }
    return emergencia;
  }

  static async finalizarEmergencia(id, actor = null) {
    const emergenciaAntes = await EmergenciaRepository.buscarPorId(id);
    if (!emergenciaAntes) {
      throw new Error('Emergencia no encontrada');
    }

    if (emergenciaAntes.estado === 'finalizada') {
      throw new Error('La emergencia ya está finalizada');
    }

    const emergencia = await EmergenciaRepository.finalizar(id);

    await AuditoriaService.registrarSeguro({
      modulo: 'emergencias',
      accion: 'FINALIZAR_EMERGENCIA',
      entidadId: emergencia.id,
      entidadNombre: emergencia.nombre,
      actor,
      descripcion: `Se finalizó la emergencia ${emergencia.nombre}.`,
      detalles: {
        estado_anterior: emergenciaAntes.estado,
        estado_nuevo: emergencia.estado,
        fecha_fin: emergencia.fecha_fin,
      },
    });

    return emergencia;
  }

  static async registrarFamilia(datos, actor = null) {
    const emergencia = await EmergenciaRepository.buscarPorId(datos.emergencia_id);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }

    const familia = await FamiliaRepository.crear(datos);

    await AuditoriaService.registrarSeguro({
      modulo: 'emergencias',
      accion: 'REGISTRAR_FAMILIA',
      entidadId: emergencia.id,
      entidadNombre: emergencia.nombre,
      actor,
      descripcion: `Se registró una familia afectada en la emergencia ${emergencia.nombre}.`,
      detalles: {
        familia_id: familia.id,
        nombre_cabeza_familia: familia.nombre_cabeza_familia,
        direccion: familia.direccion,
        miembros: familia.miembros ?? familia.cantidad_integrantes ?? null,
        prioridad: familia.prioridad,
      },
    });

    return familia;
  }

  static async listarFamilias(emergenciaId) {
    return FamiliaRepository.listarPorEmergencia(emergenciaId);
  }

  static async registrarEvaluacion(datos, actor = null) {
    const emergencia = await EmergenciaRepository.buscarPorId(datos.emergencia_id);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }

    const evaluacion = await EvaluacionRepository.crear(datos);

    await AuditoriaService.registrarSeguro({
      modulo: 'emergencias',
      accion: 'REGISTRAR_EVALUACION',
      entidadId: emergencia.id,
      entidadNombre: emergencia.nombre,
      actor,
      descripcion: `Se registró una evaluación en la emergencia ${emergencia.nombre}.`,
      detalles: {
        evaluacion_id: evaluacion.id,
        familia_id: datos.familia_id,
        estado: evaluacion.estado,
        observaciones: evaluacion.observaciones,
      },
    });

    return evaluacion;
  }

  static async listarEvaluaciones(emergenciaId) {
    return EvaluacionRepository.listarPorEmergencia(emergenciaId);
  }
}
