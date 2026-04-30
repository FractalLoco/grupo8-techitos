'use strict';
import { EntitySchema } from 'typeorm';

// Defino la entidad Evaluacion que representa la visita de diagnóstico a una familia afectada.
// Uso esta tabla para llevar el seguimiento del estado de atención de cada hogar.
export const EvaluacionEntity = new EntitySchema({
  name: 'Evaluacion',
  tableName: 'evaluaciones',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    // Guardo el ID de la emergencia para agrupar evaluaciones por evento
    emergencia_id: {
      type: 'int',
      nullable: false,
    },
    // Guardo el ID de la familia para saber a quién corresponde esta evaluación
    familia_id: {
      type: 'int',
      nullable: false,
    },
    // El estado me indica en qué punto del proceso está la evaluación
    estado: {
      type: 'varchar',
      length: 20,
      default: 'pendiente',
    },
    // Fecha en que se realizó o registró la evaluación
    fecha: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
    // Campo libre para que el evaluador anote cualquier observación relevante
    observaciones: {
      type: 'text',
      nullable: true,
    },
  },
  checks: [
    { expression: `"estado" IN ('pendiente', 'en_proceso', 'completada')` },
  ],
  relations: {
    // Relaciono esta evaluación con la emergencia a la que pertenece
    emergencia: {
      target: 'Emergencia',
      type: 'many-to-one',
      joinColumn: {
        name: 'emergencia_id',
        referencedColumnName: 'id',
      },
    },
    // Relaciono esta evaluación con la familia específica que fue evaluada
    familia: {
      target: 'Familia',
      type: 'many-to-one',
      joinColumn: {
        name: 'familia_id',
        referencedColumnName: 'id',
      },
    },
  },
});
