'use strict';
import { EntitySchema } from 'typeorm';

// Representa un área peligrosa pintada como círculo en el mapa.
// Amarilla = se puede pasar con cuidado, Roja = zona completamente bloqueada.
export const ZonaPeligroEntity = new EntitySchema({
  name: 'ZonaPeligro',
  tableName: 'zonas_peligro',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    // Dos niveles: amarilla (precaución) o roja (acceso bloqueado)
    tipo: {
      type: 'varchar',
      length: 10,
      nullable: false,
    },
    lat: {
      type: 'float',
      nullable: false,
    },
    lng: {
      type: 'float',
      nullable: false,
    },
    // Radio en metros; el coordinador lo define al crear y puede editarlo luego
    radio: {
      type: 'int',
      default: 200,
    },
    descripcion: {
      type: 'varchar',
      length: 300,
      nullable: true,
    },
    // Campo libre para dejar notas sobre el estado de la zona
    comentarios: {
      type: 'text',
      nullable: true,
    },
    creado_por: {
      type: 'int',
      nullable: false,
    },
    creado_en: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
    actualizado_en: {
      type: 'timestamp',
      updateDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  checks: [
    { expression: `"tipo" IN ('amarilla', 'roja')` },
    { expression: `"radio" >= 50 AND "radio" <= 10000` },
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
    creador: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: {
        name: 'creado_por',
        referencedColumnName: 'id',
      },
    },
  },
});
