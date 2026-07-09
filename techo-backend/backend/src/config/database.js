'use strict';
// Importo DataSource de TypeORM, que es el objeto central de conexión a la base de datos
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

// Importo cada entidad en el orden lógico de dependencias del sistema
import { UsuarioEntity } from '../entity/usuario.entity.js';
import { EmergenciaEntity } from '../entity/emergencia.entity.js';
import { FamiliaEntity } from '../entity/familia.entity.js';
import { EvaluacionEntity } from '../entity/evaluacion.entity.js';
import { CuadrillaEntity } from '../entity/cuadrilla.entity.js';
import { MiembroCuadrillaEntity } from '../entity/miembro-cuadrilla.entity.js';
import { HerramientaEntity } from '../entity/herramienta.entity.js';
import { MensajeEntity } from '../entity/mensaje.entity.js';
import { ObraEntity } from '../entity/obra.entity.js';
import { NotificacionEntity } from '../entity/notificacion.entity.js';
import { ZonaPeligroEntity } from '../entity/zona-peligro.entity.js';
import { SolicitudEntity } from '../entity/solicitud.entity.js';
import { ReporteEntity } from '../entity/reporte.entity.js';
import { MovimientoHerramientaEntity } from '../entity/movimiento-herramienta.entity.js';
import { AuditoriaEntity } from '../entity/auditoria.entity.js';

dotenv.config();

// Configuro el DataSource con los valores del .env; si no existen, uso valores por defecto seguros
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PUERTO) || 5432,
  username: process.env.DB_USUARIO || 'postgres',
  password: process.env.DB_CONTRASENA || 'postgres',
  database: process.env.DB_NOMBRE || 'techo_db',
  // Solo activo la sincronización automática de tablas en desarrollo, nunca en producción
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  // Registro todas las entidades del sistema para que TypeORM las gestione
  entities: [
    UsuarioEntity,
    EmergenciaEntity,
    FamiliaEntity,
    EvaluacionEntity,
    CuadrillaEntity,
    MiembroCuadrillaEntity,
    HerramientaEntity,
    MensajeEntity,
    ObraEntity,
    NotificacionEntity,
    ZonaPeligroEntity,
    SolicitudEntity,
    ReporteEntity,
    MovimientoHerramientaEntity,
    AuditoriaEntity,
  ],
});

// Expongo esta función para llamarla desde index.js antes de iniciar el servidor
export const initDatabase = async () => {
  try {
    await AppDataSource.initialize();

    // Corrige una instalación anterior donde auditorias.creado_en se creó como
    // TIMESTAMP sin zona horaria. En ese esquema PostgreSQL podía guardar la hora
    // UTC como hora mural y el frontend terminaba mostrándola 4 horas adelantada
    // en Chile. La conversión interpreta esos valores heredados como UTC y los
    // transforma en instantes reales TIMESTAMPTZ. En instalaciones nuevas no hace nada.
    await AppDataSource.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'auditorias'
            AND column_name = 'creado_en'
            AND data_type = 'timestamp without time zone'
        ) THEN
          ALTER TABLE auditorias
            ALTER COLUMN creado_en TYPE TIMESTAMPTZ
            USING creado_en AT TIME ZONE 'UTC';
        END IF;
      END $$;
    `);

    // Amplía el tipo de notificaciones para instalaciones existentes.
    // La restricción anterior no contemplaba los avisos de registro público.
    // En instalaciones nuevas este bloque no hace nada porque la tabla aún no existe
    // y TypeORM la crea después con la restricción actualizada de la entidad.
    await AppDataSource.query(`
      DO $$
      DECLARE
        restriccion RECORD;
      BEGIN
        IF to_regclass('public.notificaciones') IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'public'
              AND t.relname = 'notificaciones'
              AND c.contype = 'c'
              AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
              AND pg_get_constraintdef(c.oid) ILIKE '%registro_usuario%'
          ) THEN
          FOR restriccion IN
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'public'
              AND t.relname = 'notificaciones'
              AND c.contype = 'c'
              AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
          LOOP
            EXECUTE format(
              'ALTER TABLE public.notificaciones DROP CONSTRAINT %I',
              restriccion.conname
            );
          END LOOP;

          ALTER TABLE public.notificaciones
            ADD CONSTRAINT "CHK_notificaciones_tipo"
            CHECK (
              "tipo" IN (
                'asignacion_obra',
                'alerta_emergencia',
                'alerta_herramienta',
                'reasignacion',
                'broadcast',
                'mensaje_cuadrilla',
                'registro_usuario'
              )
            );
        END IF;
      END $$;
    `);

    // Crea y actualiza las tablas descritas por las entidades sin eliminar datos.
    await AppDataSource.synchronize(false);

    // Crea los tres usuarios principales solo cuando no existen.
    // La contrasena inicial de las tres cuentas es techo123.
    await AppDataSource.query(`
      INSERT INTO usuarios (nombre, rut, correo, contrasena, rol, activo)
      VALUES
        (
          'Coordinador Principal',
          '12345678-9',
          'coordinador@techo.cl',
          '$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq',
          'coordinador',
          true
        ),
        (
          'Jefe Cuadrilla Uno',
          '98765432-1',
          'jefe@techo.cl',
          '$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq',
          'jefe_cuadrilla',
          true
        ),
        (
          'Voluntario Uno',
          '11111111-1',
          'voluntario@techo.cl',
          '$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq',
          'voluntario',
          true
        )
      ON CONFLICT DO NOTHING
    `);

    console.log('Base de datos conectada correctamente');
    return AppDataSource;
  } catch (error) {
    console.error('Error al conectar la base de datos:', error.message);
    throw error;
  }
};

export default AppDataSource;
