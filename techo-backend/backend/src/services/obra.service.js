'use strict';
import { ObraRepository } from '../repositories/obra.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';

export class ObraService {
  // Se registra la obra; primero se verifica que la emergencia exista y esté activa
  static async crearObra(datos) {
    const emergencia = await EmergenciaRepository.buscarPorId(datos.emergencia_id);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }
    if (emergencia.estado !== 'activa') {
      throw new Error('Solo se pueden registrar obras en emergencias activas');
    }

    return ObraRepository.crear({
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      lat: datos.lat,
      lng: datos.lng,
      emergencia_id: datos.emergencia_id,
    });
  }

  // Se traen todas las obras de la emergencia para pintarlas como puntos en el mapa
  static async listarPorEmergencia(emergenciaId) {
    return ObraRepository.listarPorEmergencia(emergenciaId);
  }

  // Se busca una obra por su ID; si no existe se lanza error para que el frontend lo maneje
  static async obtenerDetalle(id) {
    const obra = await ObraRepository.buscarPorId(id);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    return obra;
  }

  // Se cambia el estado de la obra según avance: disponible, asignada o completada
  static async actualizarEstado(id, estado) {
    const obra = await ObraRepository.buscarPorId(id);
    if (!obra) {
      throw new Error('Obra no encontrada');
    }
    return ObraRepository.actualizar(id, { estado });
  }
}
