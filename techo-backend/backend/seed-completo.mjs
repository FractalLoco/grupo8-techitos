import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PUERTO) || 5432,
  user: process.env.DB_USUARIO || 'postgres',
  password: process.env.DB_CONTRASENA || '5235',
  database: process.env.DB_NOMBRE || 'techo_db',
});

const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result;
};

const insertarEmergenciasCompletas = async () => {
  console.log('📍 Insertando emergencias adicionales...');

  const emergencias = [
    {
      nombre: 'Inundación sector Sur-Este',
      descripcion: 'Emergencia por lluvias intensas en el sector sud-oriental',
      direccion: 'Avenida Libertad 2500, Comuna de La Florida',
      estado: 'activa',
      lat: -33.5200,
      lng: -70.5500,
    },
    {
      nombre: 'Colapso de techumbre',
      descripcion: 'Colapso estructural en vivienda vulnerable',
      direccion: 'Camino Viejo Alsino 456, Puente Alto',
      estado: 'activa',
      lat: -33.6100,
      lng: -70.5800,
    },
    {
      nombre: 'Accidente vial múltiple',
      descripcion: 'Colisión entre 3 vehículos en ruta de acceso',
      direccion: 'Ruta 5 Sur km 45, San Bernardo',
      estado: 'activa',
      lat: -33.7500,
      lng: -70.7200,
    },
    {
      nombre: 'Incendio en zona urbana',
      descripcion: 'Fuego descontrolado en sector residencial',
      direccion: 'Pasaje Oriente 123, Estación Central',
      estado: 'activa',
      lat: -33.4480,
      lng: -70.6900,
    },
  ];

  for (const emerg of emergencias) {
    const existe = await query(
      'SELECT id FROM emergencias WHERE nombre = $1',
      [emerg.nombre]
    );

    if (!existe.rowCount) {
      const result = await query(
        `INSERT INTO emergencias (nombre, descripcion, direccion, estado, lat, lng)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [emerg.nombre, emerg.descripcion, emerg.direccion, emerg.estado, emerg.lat, emerg.lng]
      );
      console.log(`✓ Emergencia creada: ${emerg.nombre} (ID: ${result.rows[0].id})`);
    }
  }
};

const insertarCuadrillasExtendidas = async () => {
  console.log('\n👷 Insertando cuadrillas adicionales...');

  // Obtener emergencias y jefe
  const emergencias = await query('SELECT id FROM emergencias ORDER BY id');
  const jefe = await query("SELECT id FROM usuarios WHERE rol = 'jefe_cuadrilla' LIMIT 1");
  const voluntarios = await query("SELECT id FROM usuarios WHERE rol = 'voluntario' ORDER BY id");

  if (!jefe.rowCount || emergencias.rowCount === 0) {
    console.log('⚠ No hay jefe o emergencias disponibles');
    return;
  }

  const jefeId = jefe.rows[0].id;
  const voluntarioIds = voluntarios.rows.map(v => v.id);

  for (const emerg of emergencias.rows) {
    const cuadrillasExistentes = await query(
      'SELECT COUNT(*) FROM cuadrillas WHERE emergencia_id = $1',
      [emerg.id]
    );

    const count = parseInt(cuadrillasExistentes.rows[0].count);
    if (count >= 3) continue; // Ya tiene suficientes

    const nombres = ['Respuesta Rápida', 'Evaluación', 'Asistencia Directa', 'Logística'];
    for (let i = 0; i < 2 - count; i++) {
      const nombre = nombres[i + count];
      const cuadrillaRes = await query(
        `INSERT INTO cuadrillas (nombre, jefe_id, emergencia_id, estado, fase, plazo_dias, fecha_asignacion)
         VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
        [nombre, jefeId, emerg.id, 'en_progreso', 'limpieza', 2]
      );

      const cuadrillaId = cuadrillaRes.rows[0].id;

      // Asignar voluntarios a la cuadrilla
      for (let j = 0; j < Math.min(3, voluntarioIds.length); j++) {
        const volId = voluntarioIds[(Math.random() * voluntarioIds.length) | 0];
        await query(
          `INSERT INTO miembros_cuadrilla (cuadrilla_id, voluntario_id, habilidades)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [cuadrillaId, volId, 'experiencia general en emergencias']
        );
      }

      console.log(`✓ Cuadrilla creada: ${nombre} para Emergencia ID ${emerg.id}`);
    }
  }
};

const insertarHerramientasExtendidas = async () => {
  console.log('\n🔧 Insertando herramientas adicionales...');

  const cuadrillas = await query('SELECT id FROM cuadrillas');
  const herramientasDisponibles = [
    'Pala', 'Carretilla', 'Martillo', 'Destornillador', 'Linterna',
    'Casco de seguridad', 'Chaleco reflectante', 'Agua embotellada',
    'Kit de primeros auxilios', 'Extintor', 'Escalera', 'Cuerda de rescate',
    'Megáfono', 'Lámpara de emergencia', 'Radio comunicador'
  ];

  for (const cuad of cuadrillas.rows) {
    const herramientasExistentes = await query(
      'SELECT COUNT(*) FROM herramientas WHERE cuadrilla_id = $1',
      [cuad.id]
    );

    const count = parseInt(herramientasExistentes.rows[0].count);
    if (count >= 5) continue; // Ya tiene suficientes

    for (let i = 0; i < 5 - count; i++) {
      const herramienta = herramientasDisponibles[Math.random() * herramientasDisponibles.length | 0];
      const existe = await query(
        'SELECT id FROM herramientas WHERE cuadrilla_id = $1 AND nombre = $2',
        [cuad.id, herramienta]
      );

      if (!existe.rowCount) {
        await query(
          `INSERT INTO herramientas (cuadrilla_id, nombre, estado, observaciones)
           VALUES ($1,$2,$3,$4)`,
          [cuad.id, herramienta, 'entregada', 'Entregada en turno matutino']
        );
      }
    }
  }

  console.log(`✓ Herramientas asignadas a cuadrillas`);
};

const insertarMensajesChat = async () => {
  console.log('\n💬 Insertando mensajes de chat...');

  const cuadrillas = await query('SELECT id FROM cuadrillas LIMIT 5');
  const usuarios = await query('SELECT id FROM usuarios ORDER BY RANDOM() LIMIT 10');

  const mensajes = [
    '¿Todos en posición?',
    'Confirmar disponibilidad de recursos',
    'Iniciando operativo en 5 minutos',
    'Reporte de situación: todo normal',
    'Solicitar refuerzo en zona norte',
    'Emergencia controlada',
    'Disponible para siguiente asignación',
    'Solicitar médico en el terreno'
  ];

  for (const cuad of cuadrillas.rows) {
    for (let i = 0; i < 3; i++) {
      const usuarioIdx = Math.random() * usuarios.rows.length | 0;
      const usuarioId = usuarios.rows[usuarioIdx].id;
      const mensaje = mensajes[Math.random() * mensajes.length | 0];

      const existe = await query(
        'SELECT id FROM mensajes WHERE cuadrilla_id = $1 AND remitente_id = $2 AND contenido = $3',
        [cuad.id, usuarioId, mensaje]
      );

      if (!existe.rowCount) {
        await query(
          `INSERT INTO mensajes (remitente_id, cuadrilla_id, contenido)
           VALUES ($1,$2,$3)`,
          [usuarioId, cuad.id, mensaje]
        );
      }
    }
  }

  console.log(`✓ Mensajes agregados a cuadrillas`);
};

const insertarMovimientosHerramienta = async () => {
  console.log('\n📦 Insertando movimientos de herramientas...');

  const cuadrillas = await query('SELECT id FROM cuadrillas LIMIT 5');
  const usuarios = await query("SELECT id FROM usuarios WHERE rol = 'jefe_cuadrilla' LIMIT 1");

  if (!usuarios.rowCount) {
    console.log('⚠ No hay jefe disponible');
    return;
  }

  const jefeId = usuarios.rows[0].id;
  const herramientas = ['Pala', 'Martillo', 'Carretilla', 'Escalera'];

  for (const cuad of cuadrillas.rows) {
    for (const herr of herramientas) {
      const existe = await query(
        `SELECT id FROM movimientos_herramienta 
         WHERE cuadrilla_id = $1 AND nombre_item = $2 
         ORDER BY fecha_salida DESC LIMIT 1`,
        [cuad.id, herr]
      );

      if (!existe.rowCount) {
        await query(
          `INSERT INTO movimientos_herramienta 
           (nombre_item, cantidad, cuadrilla_id, tipo_movimiento, tipo_item, estado, registrado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [herr, 1, cuad.id, 'salida', 'herramienta', 'activo', jefeId]
        );
      }
    }
  }

  console.log(`✓ Movimientos de herramientas registrados`);
};

const main = async () => {
  try {
    await insertarEmergenciasCompletas();
    await insertarCuadrillasExtendidas();
    await insertarHerramientasExtendidas();
    await insertarMensajesChat();
    await insertarMovimientosHerramienta();

    console.log('\n✅ Dataset completo cargado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
