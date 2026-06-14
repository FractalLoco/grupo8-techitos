// Script para insertar usuarios de prueba directamente en la BD
import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PUERTO) || 5432,
  user: process.env.DB_USUARIO || 'postgres',
  password: process.env.DB_CONTRASENA || '5235',
  database: process.env.DB_NOMBRE || 'test',
});

const usuarios = [
  { nombre: 'Coordinador Admin', rut: '12345678-9', correo: 'admin@techo.cl', contrasena: 'admin123', rol: 'coordinador' },
  { nombre: 'Juan Jefe',         rut: '11111111-1', correo: 'jefe@techo.cl',  contrasena: 'jefe123',  rol: 'jefe_cuadrilla' },
  { nombre: 'Pedro Voluntario',  rut: '22222222-2', correo: 'pedro@techo.cl', contrasena: 'vol123',   rol: 'voluntario' },
  { nombre: 'Maria Voluntaria',  rut: '33333333-3', correo: 'maria@techo.cl', contrasena: 'vol123',   rol: 'voluntario' },
  { nombre: 'Luis Voluntario',   rut: '44444444-4', correo: 'luis@techo.cl',  contrasena: 'vol123',   rol: 'voluntario' },
  { nombre: 'Ana Voluntaria',    rut: '55555555-5', correo: 'ana@techo.cl',   contrasena: 'vol123',   rol: 'voluntario' },
  { nombre: 'Carlos Voluntario', rut: '66666666-6', correo: 'carlos@techo.cl',contrasena: 'vol123',   rol: 'voluntario' },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const u of usuarios) {
      const hash = await bcrypt.hash(u.contrasena, 10);
      await client.query(
        `INSERT INTO usuarios (nombre, rut, correo, contrasena, rol, activo)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (rut) DO UPDATE SET contrasena = EXCLUDED.contrasena, activo = true`,
        [u.nombre, u.rut, u.correo, hash, u.rol]
      );
      console.log(`OK: ${u.rut} (${u.rol}) - contrasena: ${u.contrasena}`);
    }
    console.log('\nListo. Inicia sesion en http://localhost:5173');
    console.log('  Coordinador: RUT 12345678-9 / admin123');
    console.log('  Jefe:        RUT 11111111-1 / jefe123');
    console.log('  Voluntario:  RUT 22222222-2 / vol123');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
