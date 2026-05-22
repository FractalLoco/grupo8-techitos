"use strict";
import { EmergenciaRepository } from "../repositories/emergencia.repository.js";
import { FamiliaRepository } from "../repositories/familia.repository.js";
import { EvaluacionRepository } from "../repositories/evaluacion.repository.js";

export class EmergenciaService {
  // Creo una nueva emergencia con los datos recibidos; la base de datos asigna el ID y la fecha de inicio.
  static async crearEmergencia(datos) {
    return EmergenciaRepository.crear(datos);
  }

  static async actualizarEmergencia(id, datos) {
    const emergencia = await EmergenciaRepository.buscarPorId(id);

    if (!emergencia) {
      throw new Error("Emergencia no encontrada");
    }

    return EmergenciaRepository.actualizar(id, datos);
  }

  // Devuelvo solo las emergencias activas para el panel operativo del coordinador.
  static async listarActivas() {
    return EmergenciaRepository.listarActivas();
  }

  // Devuelvo todas las emergencias incluyendo las finalizadas para el historial completo.
  static async listarTodas() {
    return EmergenciaRepository.listarTodas();
  }

  // Busco la emergencia por ID y lanzo un error descriptivo si no existe, para que el controlador devuelva 404.
  static async obtenerDetalle(id) {
    const emergencia = await EmergenciaRepository.buscarPorId(id);
    if (!emergencia) {
      throw new Error("Emergencia no encontrada");
    }
    return emergencia;
  }

  // Finalizo la emergencia actualizando su estado y registrando la fecha de cierre.
  static async finalizarEmergencia(id) {
    return EmergenciaRepository.finalizar(id);
  }

  // Registro una nueva familia afectada asociándola a su emergencia correspondiente.
  static async registrarFamilia(datos) {
    return FamiliaRepository.crear(datos);
  }

  // Devuelvo todas las familias vinculadas a una emergencia para mostrarlas en el mapa o en tabla.
  static async listarFamilias(emergenciaId) {
    return FamiliaRepository.listarPorEmergencia(emergenciaId);
  }

  // Registro una evaluación de diagnóstico para una familia afectada.
  static async registrarEvaluacion(datos) {
    return EvaluacionRepository.crear(datos);
  }

  // Listo todas las evaluaciones realizadas dentro de una emergencia.
  static async listarEvaluaciones(emergenciaId) {
    return EvaluacionRepository.listarPorEmergencia(emergenciaId);
  }
}
