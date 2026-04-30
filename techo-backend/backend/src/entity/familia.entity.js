'use strict';
import { EntitySchema } from 'typeorm';

// Defino la entidad Familia que representa a un grupo familiar afectado por la emergencia.
// Registro su ubicación, prioridad y datos del jefe de hogar para coordinar la atención.
export const FamiliaEntity = new EntitySchema({
  name: 'Familia',
  tableName: 'familias',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    // Asocio la familia a su emergencia para poder filtrarlas por evento
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    // Nombre del responsable del hogar, que uso como referencia en terreno
    nombre_cabeza_familia: {
      type: 'varchar',
      length: 150,
      nullable: false,
    },
    direccion: {
      type: 'varchar',
      length: 200,
      nullable: true,
    },
    // Coordenadas para ubicar la vivienda exacta en el mapa
    lat: {
      type: 'float',
      nullable: true,
    },
    lng: {
      type: 'float',
      nullable: true,
    },
    // Cantidad de personas en el hogar; arranco en 1 como mínimo
    miembros: {
      type: 'int',
      default: 1,
    },
    // La prioridad define el orden de atención: 'alta' primero, luego 'normal', después 'baja'
    prioridad: {
      type: 'varchar',
      length: 20,
      default: 'normal',
    },
    creado_en: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  checks: [
    { expression: `"prioridad" IN ('alta', 'normal', 'baja')` },
  ],
  relations: {
    // Cada familia pertenece a una sola emergencia
    emergencia: {
      target: 'Emergencia',
      type: 'many-to-one',
      joinColumn: {
        name: 'emergencia_id',
        referencedColumnName: 'id',
      },
    },
    // Una familia puede tener múltiples evaluaciones a lo largo del proceso
    evaluaciones: {
      target: 'Evaluacion',
      type: 'one-to-many',
      inverseSide: 'familia',
    },
  },
});
