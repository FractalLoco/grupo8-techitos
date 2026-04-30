'use strict';
import { EntitySchema } from 'typeorm';

// Defino la entidad MiembroCuadrilla como tabla intermedia entre usuarios voluntarios y cuadrillas.
// A través de esta tabla controlo qué voluntario pertenece a qué cuadrilla y cuáles son sus habilidades.
export const MiembroCuadrillaEntity = new EntitySchema({
  name: 'MiembroCuadrilla',
  tableName: 'miembros_cuadrilla',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    // FK hacia la cuadrilla a la que pertenece este miembro
    cuadrilla_id: {
      type: 'int',
      nullable: false,
    },
    // FK hacia el usuario con rol 'voluntario' que integra la cuadrilla
    voluntario_id: {
      type: 'int',
      nullable: false,
    },
    // Habilidades específicas del voluntario, útiles para asignar tareas en terreno
    habilidades: {
      type: 'text',
      nullable: true,
    },
    fecha_asignacion: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  relations: {
    // Relaciono el registro con la cuadrilla a la que pertenece este voluntario
    cuadrilla: {
      target: 'Cuadrilla',
      type: 'many-to-one',
      joinColumn: {
        name: 'cuadrilla_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
    },
    // Relaciono el registro con el usuario voluntario asignado
    voluntario: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: {
        name: 'voluntario_id',
        referencedColumnName: 'id',
      },
    },
  },
});
