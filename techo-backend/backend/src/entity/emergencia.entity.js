'use strict';
import { EntitySchema } from 'typeorm';

// Defino la entidad Emergencia que representa un evento activo (desastre, siniestro, etc.).
// Desde aquí se desprenden todas las cuadrillas y familias que el sistema gestiona.
export const EmergenciaEntity = new EntitySchema({
  name: 'Emergencia',
  tableName: 'emergencias',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    nombre: {
      type: 'varchar',
      length: 150,
      nullable: false,
    },
    descripcion: {
      type: 'text',
      nullable: true,
    },
    // Manejo dos estados: 'activa' mientras se opera y 'finalizada' cuando se cierra
    estado: {
      type: 'varchar',
      length: 20,
      default: 'activa',
    },
    // Dirección legible del lugar de la emergencia para mostrar en el mapa
    direccion: {
      type: 'varchar',
      length: 300,
      nullable: true,
    },
    // Guardo las coordenadas para mostrar la emergencia en el mapa del frontend
    lat: {
      type: 'float',
      nullable: true,
    },
    lng: {
      type: 'float',
      nullable: true,
    },
    fecha_inicio: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
    // Relleno esta fecha solo cuando el coordinador finaliza la emergencia
    fecha_fin: {
      type: 'timestamp',
      nullable: true,
    },
  },
  checks: [
    { expression: `"estado" IN ('activa', 'finalizada')` },
  ],
  relations: {
    // Una emergencia puede tener muchas cuadrillas asignadas para atenderla
    cuadrillas: {
      target: 'Cuadrilla',
      type: 'one-to-many',
      inverseSide: 'emergencia',
    },
    // También registro las familias afectadas asociadas a esta emergencia
    familias: {
      target: 'Familia',
      type: 'one-to-many',
      inverseSide: 'emergencia',
    },
  },
});
