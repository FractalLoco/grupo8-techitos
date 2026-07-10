'use strict';
import { ObraRepository } from '../repositories/obra.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';
import { FamiliaRepository } from '../repositories/familia.repository.js';

function numeroOpcional(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function primerNumeroValido(...valores) {
  for (const valor of valores) {
    const numero = numeroOpcional(valor);
    if (numero !== null) return numero;
  }
  return null;
}

export class ObraService {
  // Se registra la obra verificando emergencia y familia. La ubicación enviada
  // por el frontend tiene prioridad; si falta, se hereda primero de la familia
  // y luego de la propia emergencia.
  static async crearObra(datos) {
    const emergenciaId = Number(datos.emergencia_id);
    const nombre = String(datos.nombre || '').trim();

    if (!nombre) {
      throw new Error('El nombre de la obra es obligatorio');
    }
    if (!Number.isInteger(emergenciaId)) {
      throw new Error('Emergencia inválida');
    }

    const emergencia = await EmergenciaRepository.buscarPorId(emergenciaId);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }
    if (emergencia.estado !== 'activa') {
      throw new Error('Solo se pueden registrar obras en emergencias activas');
    }

    let familia = null;
    if (datos.familia_id !== null && datos.familia_id !== undefined && datos.familia_id !== '') {
      const familiaId = Number(datos.familia_id);
      if (!Number.isInteger(familiaId)) {
        throw new Error('Familia inválida');
      }

      familia = await FamiliaRepository.buscarPorId(familiaId);
      if (!familia) {
        throw new Error('Familia no encontrada');
      }
      if (Number(familia.emergencia_id) !== emergenciaId) {
        throw new Error('La familia seleccionada no pertenece a la emergencia de la obra');
      }
    }

    const lat = primerNumeroValido(datos.lat, familia?.lat, emergencia.lat);
    const lng = primerNumeroValido(datos.lng, familia?.lng, emergencia.lng);
    if (lat === null || lng === null) {
      throw new Error('Selecciona una dirección válida para ubicar la obra');
    }

    const direccion = String(
      datos.direccion || familia?.direccion || emergencia.direccion || ''
    ).trim() || null;

    return ObraRepository.crear({
      nombre,
      descripcion: String(datos.descripcion || emergencia.descripcion || '').trim() || null,
      direccion,
      lat,
      lng,
      emergencia_id: emergenciaId,
      familia_id: familia?.id ?? null,
    });
  }

  static async listarPorEmergencia(emergenciaId) {
    return ObraRepository.listarPorEmergencia(emergenciaId);
  }

  static async listarTodas() {
    return ObraRepository.listarTodas();
  }

  static async obtenerDetalle(id) {
    const obra = await ObraRepository.buscarPorId(id);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    return obra;
  }

  static async actualizarEstado(id, estado) {
    const estadosValidos = new Set(['disponible', 'asignada', 'completada']);
    if (!estadosValidos.has(estado)) {
      throw new Error('Estado de obra inválido');
    }
    const obra = await ObraRepository.buscarPorId(id);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    // Una obra completada es un estado terminal: no se puede reabrir ni volver atrás
    if (obra.estado === 'completada' && estado !== 'completada') {
      throw new Error('La obra ya está completada y no se puede cambiar su estado');
    }
    return ObraRepository.actualizar(id, { estado });
  }
}
