'use strict';
import { EntitySchema } from 'typeorm';

// Registro inmutable de acciones relevantes realizadas sobre usuarios y emergencias.
// Guardo una copia del nombre/rol del actor para conservar el contexto histórico
// incluso si más adelante ese usuario cambia sus datos o se desactiva.
export const AuditoriaEntity = new EntitySchema({
  name: 'Auditoria',
  tableName: 'auditorias',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    modulo: {
      type: 'varchar',
      length: 30,
      nullable: false,
    },
    accion: {
      type: 'varchar',
      length: 60,
      nullable: false,
    },
    entidad_id: {
      type: 'int',
      nullable: true,
    },
    entidad_nombre: {
      type: 'varchar',
      length: 180,
      nullable: true,
    },
    actor_usuario_id: {
      type: 'int',
      nullable: true,
    },
    actor_nombre: {
      type: 'varchar',
      length: 120,
      nullable: true,
    },
    actor_rol: {
      type: 'varchar',
      length: 40,
      nullable: true,
    },
    descripcion: {
      type: 'text',
      nullable: true,
    },
    detalles: {
      type: 'jsonb',
      nullable: true,
    },
    creado_en: {
      type: 'timestamptz',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  checks: [
    { expression: `"modulo" IN ('usuarios', 'emergencias')` },
  ],
  relations: {
    actor: {
      target: 'Usuario',
      type: 'many-to-one',
      nullable: true,
      onDelete: 'SET NULL',
      joinColumn: {
        name: 'actor_usuario_id',
        referencedColumnName: 'id',
      },
    },
  },
});
