'use strict';
import { EntitySchema } from 'typeorm';

// Guarda los avisos in-app de cada usuario; el frontend los consulta para mostrar la campana
export const NotificacionEntity = new EntitySchema({
  name: 'Notificacion',
  tableName: 'notificaciones',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    usuario_id: {
      type: 'int',
      nullable: false,
    },
    titulo: {
      type: 'varchar',
      length: 200,
      nullable: false,
    },
    mensaje: {
      type: 'text',
      nullable: false,
    },
    // Mientras sea false aparece en el contador de campana sin leer
    leida: {
      type: 'boolean',
      default: false,
    },
    // El tipo le dice al frontend qué ícono o color usar para cada aviso
    tipo: {
      type: 'varchar',
      length: 50,
      nullable: false,
    },
    // ID de la entidad relacionada, útil para que el frontend navegue directo al detalle
    referencia_id: {
      type: 'int',
      nullable: true,
    },
    // Para navegar al chat de la cuadrilla desde la notificación
    cuadrilla_id: {
      type: 'int',
      nullable: true,
    },
    creado_en: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  checks: [
    { expression: `"tipo" IN ('asignacion_obra', 'alerta_emergencia', 'alerta_herramienta', 'reasignacion', 'broadcast', 'mensaje_cuadrilla')` },
  ],
  relations: {
    usuario: {
      target: 'Usuario',
      type: 'many-to-one',
      joinColumn: {
        name: 'usuario_id',
        referencedColumnName: 'id',
      },
    },
  },
});
