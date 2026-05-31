'use strict';
import { EntitySchema } from 'typeorm';

// Defino la entidad Usuario que representa a todas las personas del sistema.
// Uso esta tabla para autenticar, autorizar y gestionar roles (coordinador, jefe_cuadrilla, voluntario).
export const UsuarioEntity = new EntitySchema({
  name: 'Usuario',
  tableName: 'usuarios',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    nombre: {
      type: 'varchar',
      length: 100,
      nullable: false,
    },
    // Uso el RUT como identificador único de inicio de sesión en lugar del correo
    rut: {
      type: 'varchar',
      length: 12,
      unique: true,
      nullable: false,
    },
    correo: {
      type: 'varchar',
      length: 100,
      unique: true,
      nullable: false,
    },
    // Almaceno la contraseña siempre con hash bcrypt, nunca en texto plano
    contrasena: {
      type: 'varchar',
      length: 255,
      nullable: false,
    },
    // El rol determina los permisos que tendrá este usuario en toda la plataforma
    rol: {
      type: 'varchar',
      length: 20,
      nullable: false,
    },
    // Arranco la cuenta como inactiva; el coordinador debe activarla manualmente
    activo: {
      type: 'boolean',
      default: false,
    },
    creado_en: {
      type: 'timestamp',
      createDate: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
  },
  // Protejo la integridad del rol directamente en la base de datos
  checks: [
    { expression: `"rol" IN ('coordinador', 'jefe_cuadrilla', 'voluntario')` },
  ],
  relations: {
    // Un usuario puede ser jefe de muchas cuadrillas a lo largo del tiempo
    cuadrillasComoJefe: {
      target: 'Cuadrilla',
      type: 'one-to-many',
      inverseSide: 'jefe',
    },
    // Un voluntario puede estar asignado como miembro en una cuadrilla
    membresias: {
      target: 'MiembroCuadrilla',
      type: 'one-to-many',
      inverseSide: 'voluntario',
    },
  },
});
