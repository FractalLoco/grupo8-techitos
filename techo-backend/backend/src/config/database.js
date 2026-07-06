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
  synchronize: process.env.NODE_ENV === 'development',
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
  ],
});

// Expongo esta función para llamarla desde index.js antes de iniciar el servidor
export const initDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Base de datos conectada correctamente');
    return AppDataSource;
  } catch (error) {
    console.error('Error al conectar la base de datos:', error.message);
    throw error;
  }
};

export default AppDataSource;
