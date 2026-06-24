'use strict';
import { EntitySchema } from 'typeorm';

export const SolicitudEntity = new EntitySchema({
  name: 'Solicitud',
  tableName: 'solicitudes',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    jefe_id: {
      type: 'int',
      nullable: false,
    },
    cuadrilla_id: {
      type: 'int',
      nullable: false,
    },
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    tipo: {
      type: 'varchar',
      length: 20,
      nullable: false,
    },
    descripcion: {
      type: 'text',
      nullable: false,
    },
    estado: {
      type: 'varchar',
      length: 20,
      default: 'pendiente',
    },
    fecha_creacion: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
    respuesta: {
      type: 'text',
      nullable: true,
    },
  },
  checks: [
    { expression: `"tipo" IN ('herramienta', 'epp')` },
    { expression: `"estado" IN ('pendiente', 'aprobada', 'rechazada')` },
  ],
  relations: {
    jefe: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: { name: 'jefe_id', referencedColumnName: 'id' },
    },
    cuadrilla: {
      target: 'Cuadrilla',
      type: 'many-to-one',
      joinColumn: { name: 'cuadrilla_id', referencedColumnName: 'id' },
    },
    emergencia: {
      target: 'Emergencia',
      type: 'many-to-one',
      joinColumn: { name: 'emergencia_id', referencedColumnName: 'id' },
    },
  },
});
