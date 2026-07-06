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
    // Quien realmente creó la solicitud (voluntario, jefe o coordinador).
    // Nullable para no romper filas antiguas creadas antes de esta columna.
    solicitante_id: {
      type: 'int',
      nullable: true,
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
    nombre_item: {
      type: 'varchar',
      length: 150,
      nullable: true,
    },
    cantidad: {
      type: 'int',
      default: 1,
      nullable: true,
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
    { expression: `"tipo" IN ('herramienta', 'epp', 'material', 'otro')` },
    { expression: `"estado" IN ('pendiente', 'aprobada', 'rechazada')` },
  ],
  relations: {
    jefe: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: { name: 'jefe_id', referencedColumnName: 'id' },
    },
    solicitante: {
      target: 'Usuario',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'solicitante_id', referencedColumnName: 'id' },
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
