'use strict';
import { ObraRepository } from '../repositories/obra.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';

export class ObraService {
  // Se registra la obra; primero se verifica que la emergencia exista y esté activa.
  // La ubicación debe venir de una dirección seleccionada/geocodificada en el frontend.
  static async crearObra(datos) {
    const emergenciaId = Number(datos.emergencia_id);
    const lat = Number(datos.lat);
    const lng = Number(datos.lng);
    const nombre = String(datos.nombre || '').trim();

    if (!nombre) {
      throw new Error('El nombre de la obra es obligatorio');
    }
    if (!Number.isInteger(emergenciaId)) {
      throw new Error('Emergencia inválida');
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Selecciona una dirección válida para ubicar la obra');
    }

    const emergencia = await EmergenciaRepository.buscarPorId(emergenciaId);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }
    if (emergencia.estado !== 'activa') {
      throw new Error('Solo se pueden registrar obras en emergencias activas');
    }

    return ObraRepository.crear({
      nombre,
      descripcion: String(datos.descripcion || '').trim() || null,
      direccion: String(datos.direccion || '').trim() || null,
      lat,
      lng,
      emergencia_id: emergenciaId,
    });
  }

  // Se traen todas las obras de la emergencia para pintarlas como puntos en el mapa
  static async listarPorEmergencia(emergenciaId) {
    return ObraRepository.listarPorEmergencia(emergenciaId);
  }

  // Se traen todas las obras del sistema para una vista global del mapa
  static async listarTodas() {
    return ObraRepository.listarTodas();
  }

  // Se busca una obra por su ID; si no existe se lanza error para que el frontend lo maneje
  static async obtenerDetalle(id) {
    const obra = await ObraRepository.buscarPorId(id);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    return obra;
  }

  // Se cambia el estado de la obra según avance: disponible, asignada o completada.
  static async actualizarEstado(id, estado) {
    const estadosValidos = new Set(['disponible', 'asignada', 'completada']);
    if (!estadosValidos.has(estado)) {
      throw new Error('Estado de obra inválido');
    }
    const obra = await ObraRepository.buscarPorId(id);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    return ObraRepository.actualizar(id, { estado });
  }
}
