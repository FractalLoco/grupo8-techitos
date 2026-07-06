'use strict';
import { EntitySchema } from 'typeorm';

export const MovimientoHerramientaEntity = new EntitySchema({
  name: 'MovimientoHerramienta',
  tableName: 'movimientos_herramienta',
  columns: {
    id: { primary: true, type: 'int', generated: true },
    nombre_item: { type: 'varchar', length: 150, nullable: false },
    cantidad: { type: 'int', default: 1 },
    persona_recibe: { type: 'varchar', length: 150, nullable: true },
    motivo: { type: 'text', nullable: true },
    obra_descripcion: { type: 'varchar', length: 200, nullable: true },
    emergencia_id: { type: 'int', nullable: true },
    cuadrilla_id: { type: 'int', nullable: true },
    tipo_item: { type: 'varchar', length: 20, default: 'herramienta' },
    // 'salida' = ítem que sale del almacén, 'entrada_stock' = nuevo stock que entra al almacén
    tipo_movimiento: { type: 'varchar', length: 20, default: 'salida' },
    solicitud_id: { type: 'int', nullable: true },
    fecha_salida: { type: 'timestamp', createDate: true, default: () => 'CURRENT_TIMESTAMP' },
    fecha_entrada: { type: 'timestamp', nullable: true },
    estado: { type: 'varchar', length: 15, default: 'activo' },
    registrado_por: { type: 'int', nullable: true },
    observaciones: { type: 'text', nullable: true },
  },
  checks: [
    { expression: `"tipo_item" IN ('herramienta', 'epp', 'material', 'otro')` },
    { expression: `"estado" IN ('activo', 'devuelto')` },
    { expression: `"tipo_movimiento" IN ('salida', 'entrada_stock')` },
  ],
  relations: {
    emergencia: {
      target: 'Emergencia',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'emergencia_id', referencedColumnName: 'id' },
    },
    usuario: {
      target: 'Usuario',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'registrado_por', referencedColumnName: 'id' },
    },
  },
});
