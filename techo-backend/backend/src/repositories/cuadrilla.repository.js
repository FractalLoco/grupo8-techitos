'use strict';
import { In } from 'typeorm';
import AppDataSource from '../config/database.js';

export class CuadrillaRepository {
  static getRepository() {
    return AppDataSource.getRepository('Cuadrilla');
  }

  // Creo y persisto una nueva cuadrilla con los datos iniciales recibidos del servicio
  static async crear(datos) {
    const repo = this.getRepository();
    const cuadrilla = repo.create(datos);
    return repo.save(cuadrilla);
  }

  // Busco una cuadrilla por su ID para validarla antes de operaciones como asignar obra o cambiar fase
  static async buscarPorId(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  // Listo las cuadrillas de una emergencia específica ordenadas por la más reciente primero
  static async listarPorEmergencia(emergenciaId) {
    return this.getRepository().find({
      where: { emergencia_id: emergenciaId },
      order: { fecha_creacion: 'DESC' },
    });
  }

  // Listo todas las cuadrillas del sistema independientemente de la emergencia
  static async listarTodas() {
    return this.getRepository().find({ order: { fecha_creacion: 'DESC' } });
  }

  // Listo las cuadrillas activas (estado 'activa' o 'en_progreso') ordenadas por nombre
  static async listarActivas() {
    return this.getRepository().find({
      where: { estado: In(['activa', 'en_progreso']) },
      order: { nombre: 'ASC' },
    });
  }

  // Listo las cuadrillas activas donde el usuario es el jefe de la cuadrilla
  static async listarActivasPorJefe(jefeId) {
    return this.getRepository().find({
      where: { jefe_id: jefeId, estado: In(['activa', 'en_progreso']) },
      order: { nombre: 'ASC' },
    });
  }

  // Actualizo campos parciales de una cuadrilla y devuelvo el registro resultante
  static async actualizar(id, datos) {
    const repo = this.getRepository();
    await repo.update(id, datos);
    return this.buscarPorId(id);
  }

  // Cambio el estado de la cuadrilla; si pasa a 'completada' registro también la fecha de cierre
  static async actualizarEstado(id, estado) {
    const datos = { estado };
    if (estado === 'completada') {
      datos.fecha_completada = new Date();
    }
    return this.actualizar(id, datos);
  }

  // Actualizo la fase de avance de la cuadrilla: limpieza, montaje o terminaciones
  static async actualizarFase(id, fase) {
    return this.actualizar(id, { fase });
  }

  // Activo la alerta de emergencia con la descripción que el jefe envió desde terreno
  static async activarAlerta(id, descripcion) {
    return this.actualizar(id, { alerta_emergencia: true, descripcion_emergencia: descripcion });
  }

  // Desactivo la alerta de emergencia una vez que la situación fue resuelta
  static async desactivarAlerta(id) {
    return this.actualizar(id, { alerta_emergencia: false, descripcion_emergencia: null });
  }

  // Asigno la obra a la cuadrilla y registro el momento exacto de la asignación para medir el plazo
  static async asignarObra(id, obraId) {
    return this.actualizar(id, { obra_asignada_id: obraId, fecha_asignacion: new Date() });
  }

  // Cuento los miembros actuales de una cuadrilla usando el repositorio de MiembroCuadrilla
  static async contarMiembros(cuadrillaId) {
    const repoMiembros = AppDataSource.getRepository('MiembroCuadrilla');
    return repoMiembros.count({ where: { cuadrilla_id: cuadrillaId } });
  }

  // Enriquezco cada cuadrilla con la cantidad de miembros y el color de estado según el plazo restante
  static async obtenerConEstado(emergenciaId) {
    const cuadrillas = await this.listarPorEmergencia(emergenciaId);
    return Promise.all(
      cuadrillas.map(async (cuadrilla) => {
        const miembrosCount = await this.contarMiembros(cuadrilla.id);
        const estadoColor = this.calcularEstadoColor(cuadrilla);
        return { ...cuadrilla, miembrosCount, estadoColor };
      })
    );
  }

  // Igual que obtenerConEstado pero sin filtrar por emergencia (vista global)
  static async obtenerTodasConEstado() {
    const cuadrillas = await this.listarTodas();
    return Promise.all(
      cuadrillas.map(async (cuadrilla) => {
        const miembrosCount = await this.contarMiembros(cuadrilla.id);
        const estadoColor = this.calcularEstadoColor(cuadrilla);
        return { ...cuadrilla, miembrosCount, estadoColor };
      })
    );
  }

  // Calculo el color de estado según los días transcurridos respecto al plazo total asignado.
  // Azul = sin obra asignada, Verde = en plazo, Amarillo = >70% del tiempo usado, Rojo = vencida, Gris = completada.
  static calcularEstadoColor(cuadrilla) {
    if (cuadrilla.estado === 'completada') return 'gris';
    if (!cuadrilla.fecha_asignacion) return 'azul';

    const ahora = new Date();
    const asignacion = new Date(cuadrilla.fecha_asignacion);
    const diasTranscurridos = (ahora - asignacion) / (1000 * 60 * 60 * 24);
    const plazo = cuadrilla.plazo_dias || 5;
    const proporcion = diasTranscurridos / plazo;

    if (proporcion > 1) return 'rojo';
    if (proporcion > 0.7) return 'amarillo';
    return 'verde';
  }
}
