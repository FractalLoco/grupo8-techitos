'use strict';
import { ZonaPeligroRepository } from '../repositories/zona-peligro.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';

export class ZonaPeligroService {
  // Valido que la emergencia exista y este activa antes de crear la zona
  static async crearZona(datos) {
    const emergencia = await EmergenciaRepository.buscarPorId(datos.emergencia_id);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }
    if (emergencia.estado !== 'activa') {
      throw new Error('Solo se pueden agregar zonas a emergencias activas');
    }

    return ZonaPeligroRepository.crear({
      lat: datos.lat,
      lng: datos.lng,
      radio: datos.radio || 200,
      tipo: datos.tipo,
      comentario: datos.comentario || null,
      emergencia_id: datos.emergencia_id,
      creado_por: datos.creado_por,
    });
  }

  // Devuelvo todas las zonas de una emergencia para que el mapa las pinte como circulos
  static async listarPorEmergencia(emergenciaId) {
    return ZonaPeligroRepository.listarPorEmergencia(emergenciaId);
  }

  // Elimino la zona verificando que exista antes de borrarla
  static async eliminarZona(id) {
    const zona = await ZonaPeligroRepository.buscarPorId(id);
    if (!zona) {
      throw new Error('Zona de peligro no encontrada');
    }
    await ZonaPeligroRepository.eliminar(id);
    return { eliminado: true };
  }
}
