'use strict';
import { EntitySchema } from 'typeorm';

// Cada obra es un punto en el mapa que el coordinador crea y luego asigna a una cuadrilla
export const ObraEntity = new EntitySchema({
  name: 'Obra',
  tableName: 'obras',
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
    // Dirección completa para mostrar junto a las coordenadas en el mapa
    direccion: {
      type: 'varchar',
      length: 300,
      nullable: true,
    },
    // Coordenadas que usa Leaflet para pintar el punto exacto en el mapa
    lat: {
      type: 'float',
      nullable: false,
    },
    lng: {
      type: 'float',
      nullable: false,
    },
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    // Arranca disponible, pasa a asignada cuando se le une una cuadrilla y a completada al terminar
    estado: {
      type: 'varchar',
      length: 20,
      default: 'disponible',
    },
    fecha_creacion: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  checks: [
    { expression: `"estado" IN ('disponible', 'asignada', 'completada')` },
  ],
  relations: {
    emergencia: {
      target: 'Emergencia',
      type: 'many-to-one',
      joinColumn: {
        name: 'emergencia_id',
        referencedColumnName: 'id',
      },
    },
  },
});
