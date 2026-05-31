'use strict';
import { EntitySchema } from 'typeorm';

// Entidad Mensaje para representar mensajes de chat y eventos (avance, finalizado, emergencia)
export const MensajeEntity = new EntitySchema({
  name: 'Mensaje',
  tableName: 'mensajes',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    cuadrilla_id: {
      type: 'int',
      nullable: true,
    },
    remitente_id: {
      type: 'int',
      nullable: false,
    },
    tipo: {
      type: 'varchar',
      length: 50,
      default: 'texto',
    },
    contenido: {
      type: 'text',
      nullable: true,
    },
    archivo_url: {
      type: 'text',
      nullable: true,
    },
    prioridad: {
      type: 'boolean',
      default: false,
    },
    creado_en: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  relations: {
    remitente: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: { name: 'remitente_id' },
      nullable: false,
    },
    cuadrilla: {
      target: 'Cuadrilla',
      type: 'many-to-one',
      joinColumn: { name: 'cuadrilla_id' },
      nullable: true,
    },
  },
});
