'use strict';
import { EntitySchema } from 'typeorm';

// Almacena los reportes PDF generados a partir de los datos de una emergencia.
// Cada reporte guarda un snapshot JSONB de los datos en el momento de generación
// para mantener consistencia histórica aunque los datos fuente cambien después.
export const ReporteEntity = new EntitySchema({
  name: 'Reporte',
  tableName: 'reportes',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    // Relación con la emergencia de la que se generó el reporte
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    // Usuario que solicitó o generó el reporte
    generado_por: {
      type: 'int',
      nullable: false,
    },
    // Nombre legible del archivo PDF generado
    nombre_archivo: {
      type: 'varchar',
      length: 255,
      nullable: false,
    },
    // Ruta o URL donde está almacenado el PDF
    archivo_url: {
      type: 'text',
      nullable: false,
    },
    // Snapshot completo de los datos usados para generar el reporte en formato JSON
    datos_snapshot: {
      type: 'jsonb',
      nullable: false,
    },
    // Marca temporal de cuándo se generó el reporte
    generado_en: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  relations: {
    // Relación muchos-a-uno con la emergencia: un reporte pertenece a una emergencia
    emergencia: {
      target: 'Emergencia',
      type: 'many-to-one',
      joinColumn: {
        name: 'emergencia_id',
        referencedColumnName: 'id',
      },
    },
    // Relación muchos-a-uno con el usuario que generó el reporte
    generadoPor: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: {
        name: 'generado_por',
        referencedColumnName: 'id',
      },
    },
  },
});
