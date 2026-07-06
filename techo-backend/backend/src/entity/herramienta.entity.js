'use strict';
import { EntitySchema } from 'typeorm';

// Defino la entidad Herramienta que representa cada herramienta entregada a una cuadrilla.
// Uso esta tabla para generar el balance de materiales al finalizar la obra.
export const HerramientaEntity = new EntitySchema({
  name: 'Herramienta',
  tableName: 'herramientas',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    // Asocio la herramienta a su cuadrilla para poder filtrar y hacer el balance por equipo
    cuadrilla_id: {
      type: 'int',
      nullable: false,
    },
    nombre: {
      type: 'varchar',
      length: 100,
      nullable: false,
    },
    // El estado cambia durante la operación: arranca en 'entregada' y puede pasar a 'buena', 'danada', etc.
    estado: {
      type: 'varchar',
      length: 20,
      default: 'entregada',
    },
    fecha_registro: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
    // Categoría del ítem para poder filtrar por tipo en el inventario (herramienta, epp, material, otro)
    tipo_item: {
      type: 'varchar',
      length: 20,
      default: 'herramienta',
      nullable: true,
    },
    // Anoto aquí cualquier detalle sobre el estado de la herramienta al momento de devolverla
    observaciones: {
      type: 'text',
      nullable: true,
    },
  },
  checks: [
    { expression: `"estado" IN ('entregada', 'buena', 'danada', 'perdida', 'no_devuelta')` },
    { expression: `"tipo_item" IN ('herramienta', 'epp', 'material', 'otro')` },
  ],
  relations: {
    // Cada herramienta pertenece a una sola cuadrilla
    cuadrilla: {
      target: 'Cuadrilla',
      type: 'many-to-one',
      joinColumn: {
        name: 'cuadrilla_id',
        referencedColumnName: 'id',
      },
    },
  },
});
