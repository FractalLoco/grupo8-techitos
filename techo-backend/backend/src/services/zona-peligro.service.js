'use strict';
import { ZonaPeligroRepository } from '../repositories/zona-peligro.repository.js';
import { EmergenciaRepository } from '../repositories/emergencia.repository.js';

const RADIO_MIN = 50;
const RADIO_MAX = 10000;

export class ZonaPeligroService {
  // Valido la emergencia activa y que el radio esté dentro del rango permitido antes de crear
  static async crearZona(datos, usuarioId) {
    const emergencia = await EmergenciaRepository.buscarPorId(datos.emergencia_id);
    if (!emergencia) {
      throw new Error('Emergencia no encontrada');
    }
    if (emergencia.estado !== 'activa') {
      throw new Error('Solo se pueden crear zonas de peligro en emergencias activas');
    }

    const radio = Number(datos.radio) || 200;
    if (radio < RADIO_MIN || radio > RADIO_MAX) {
      throw new Error(`El radio debe estar entre ${RADIO_MIN} y ${RADIO_MAX} metros`);
    }

    if (!['amarilla', 'roja'].includes(datos.tipo)) {
      throw new Error('El tipo de zona debe ser "amarilla" o "roja"');
    }

    return ZonaPeligroRepository.crear({
      emergencia_id: datos.emergencia_id,
      tipo: datos.tipo,
      lat: datos.lat,
      lng: datos.lng,
      radio,
      descripcion: datos.descripcion || null,
      comentarios: datos.comentarios || null,
      creado_por: usuarioId,
    });
  }

  // Devuelvo todas las zonas de peligro de una emergencia para pintarlas como círculos en el mapa
  static async listarPorEmergencia(emergenciaId) {
    return ZonaPeligroRepository.listarPorEmergencia(emergenciaId);
  }

  // Edito los campos de una zona; el radio se vuelve a validar si el coordinador lo cambia
  static async actualizarZona(id, datos) {
    const zona = await ZonaPeligroRepository.buscarPorId(id);
    if (!zona) {
      throw new Error('Zona de peligro no encontrada');
    }

    if (datos.radio !== undefined) {
      const radio = Number(datos.radio);
      if (radio < RADIO_MIN || radio > RADIO_MAX) {
        throw new Error(`El radio debe estar entre ${RADIO_MIN} y ${RADIO_MAX} metros`);
      }
    }

    if (datos.tipo && !['amarilla', 'roja'].includes(datos.tipo)) {
      throw new Error('El tipo de zona debe ser "amarilla" o "roja"');
    }

    const camposEditables = {};
    if (datos.tipo !== undefined) camposEditables.tipo = datos.tipo;
    if (datos.lat !== undefined) camposEditables.lat = datos.lat;
    if (datos.lng !== undefined) camposEditables.lng = datos.lng;
    if (datos.radio !== undefined) camposEditables.radio = Number(datos.radio);
    if (datos.descripcion !== undefined) camposEditables.descripcion = datos.descripcion;
    if (datos.comentarios !== undefined) camposEditables.comentarios = datos.comentarios;

    return ZonaPeligroRepository.actualizar(id, camposEditables);
  }

  // Elimino la zona del mapa cuando el coordinador lo decide
  static async eliminarZona(id) {
    const zona = await ZonaPeligroRepository.buscarPorId(id);
    if (!zona) {
      throw new Error('Zona de peligro no encontrada');
    }
    await ZonaPeligroRepository.eliminar(id);
  }
}
