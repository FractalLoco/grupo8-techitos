'use strict';
import { EntitySchema } from 'typeorm';

// Defino la entidad Cuadrilla que representa un equipo de voluntarios organizado para atender una emergencia.
// Llevo el control de su estado, fase de avance, plazo y alertas activas.
export const CuadrillaEntity = new EntitySchema({
  name: 'Cuadrilla',
  tableName: 'cuadrillas',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    nombre: {
      type: 'varchar',
      length: 100,
      nullable: false,
    },
    // Guardo el ID del jefe para validar quién puede actualizar la fase y enviar alertas
    jefe_id: {
      type: 'int',
      nullable: false,
    },
    // Relaciono la cuadrilla con su emergencia para filtrar y agrupar correctamente
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    // Vinculo la cuadrilla a una obra específica una vez que el coordinador la asigna
    obra_asignada_id: {
      type: 'int',
      nullable: true,
    },
    // El estado global de la cuadrilla; arranca como 'activa' al crearla
    estado: {
      type: 'varchar',
      length: 20,
      default: 'activa',
    },
    // La fase indica en qué etapa de trabajo se encuentra la cuadrilla
    fase: {
      type: 'varchar',
      length: 20,
      nullable: true,
    },
    // Días de plazo para completar la obra; uso esto para calcular el color de estado
    plazo_dias: {
      type: 'int',
      default: 5,
    },
    fecha_creacion: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
    // Registro cuándo se le asignó una obra para medir el tiempo transcurrido
    fecha_asignacion: {
      type: 'timestamp',
      nullable: true,
    },
    // Anoto la fecha de finalización cuando marco la cuadrilla como completada
    fecha_completada: {
      type: 'timestamp',
      nullable: true,
    },
    // Bandera que activa el jefe cuando ocurre una situación de riesgo en terreno
    alerta_emergencia: {
      type: 'boolean',
      default: false,
    },
    // Descripción libre que envía el jefe al activar la alerta
    descripcion_emergencia: {
      type: 'text',
      nullable: true,
    },
  },
  // Combino ambas restricciones en un solo arreglo para que TypeORM las aplique correctamente
  checks: [
    { expression: `"estado" IN ('activa', 'en_progreso', 'completada', 'desarmada')` },
    { expression: `"fase" IN ('limpieza', 'montaje', 'terminaciones') OR "fase" IS NULL` },
  ],
  relations: {
    // Cada cuadrilla pertenece a una sola emergencia
    emergencia: {
      target: 'Emergencia',
      type: 'many-to-one',
      joinColumn: {
        name: 'emergencia_id',
        referencedColumnName: 'id',
      },
    },
    // Cada cuadrilla tiene un único jefe de cuadrilla asignado
    jefe: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: {
        name: 'jefe_id',
        referencedColumnName: 'id',
      },
    },
    // Mantengo el listado de voluntarios que pertenecen a esta cuadrilla
    miembros: {
      target: 'MiembroCuadrilla',
      type: 'one-to-many',
      inverseSide: 'cuadrilla',
    },
    // Registro las herramientas entregadas a esta cuadrilla para hacer el balance al cierre
    herramientas: {
      target: 'Herramienta',
      type: 'one-to-many',
      inverseSide: 'cuadrilla',
    },
  },
});
