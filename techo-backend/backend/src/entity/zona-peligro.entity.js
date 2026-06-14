'use strict';
import { EntitySchema } from 'typeorm';

// Zona de peligro: area circular en el mapa que el coordinador marca para advertir a las cuadrillas.
// Amarilla = zona dificil de atravesar, Roja = zona imposible de pasar.
export const ZonaPeligroEntity = new EntitySchema({
  name: 'ZonaPeligro',
  tableName: 'zonas_peligro',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    // Latitud del centro del circulo
    lat: {
      type: 'float',
      nullable: false,
    },
    // Longitud del centro del circulo
    lng: {
      type: 'float',
      nullable: false,
    },
    // Radio en metros que define el tamano del area de peligro en el mapa
    radio: {
      type: 'float',
      default: 200,
    },
    // 'amarilla' = dificil de pasar, 'roja' = imposible pasar
    tipo: {
      type: 'varchar',
      length: 20,
      nullable: false,
    },
    // Descripcion libre del peligro para que las cuadrillas sepan que se encontraran
    comentario: {
      type: 'text',
      nullable: true,
    },
    // Emergencia a la que pertenece esta zona
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    // Usuario coordinador que creo la zona
    creado_por: {
      type: 'int',
      nullable: false,
    },
    fecha_creacion: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  checks: [
    { expression: `"tipo" IN ('amarilla', 'roja')` },
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
