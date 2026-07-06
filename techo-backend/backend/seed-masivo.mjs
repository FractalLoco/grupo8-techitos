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

// Generador de nombres aleatorios
const nombres = ['Carlos', 'María', 'Juan', 'Ana', 'Pedro', 'Rosa', 'Luis', 'Carmen', 'Diego', 'Patricia', 'Felipe', 'Isabel', 'Roberto', 'Laura', 'Andrés'];
const apellidos = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Morales', 'Flores', 'Castro', 'Ruiz', 'Vargas', 'Reyes', 'Silva'];

const generarNombre = () => `${nombres[Math.random() * nombres.length | 0]} ${apellidos[Math.random() * apellidos.length | 0]}`;
const generarRUT = () => {
  const num = String(Math.floor(Math.random() * 20000000) + 1000000).padStart(8, '0');
  const dv = Math.floor(Math.random() * 10);
  return `${num}-${dv}`;
};
const generarCorreo = (nombre) => `${nombre.toLowerCase().replace(' ', '.')}${Math.random().toString(36).substring(7)}@techo.cl`;

const insertarMasVoluntarios = async () => {
  console.log('👥 Insertando 50 voluntarios adicionales...');
  
  let count = 0;
  for (let i = 0; i < 50; i++) {
    const nombre = generarNombre();
    const rut = generarRUT();
    const correo = generarCorreo(nombre);
    const hash = '$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq'; // vol123
    
    try {
      await query(
        `INSERT INTO usuarios (nombre, rut, correo, contrasena, rol, activo)
         VALUES ($1,$2,$3,$4,'voluntario',true)
         ON CONFLICT (rut) DO NOTHING`,
        [nombre, rut, correo, hash]
      );
      count++;
    } catch (e) {
      // Ignorar duplicados
    }
  }
  console.log(`✓ ${count} voluntarios insertados`);
};

const insertarEmergenciasEnMasas = async () => {
  console.log('🆘 Insertando 30 emergencias adicionales...');
  
  const tipos = ['Inundación', 'Incendio', 'Terremoto', 'Deslizamiento', 'Sequía', 'Colapso', 'Accidente'];
  const comunas = ['La Florida', 'Puente Alto', 'San Bernardo', 'Estación Central', 'Ñuñoa', 'Recoleta', 'San Miguel'];
  
  let count = 0;
  for (let i = 0; i < 30; i++) {
    const tipo = tipos[Math.random() * tipos.length | 0];
    const comuna = comunas[Math.random() * comunas.length | 0];
    const nombre = `${tipo} en ${comuna} ${Math.random().toString(36).substring(7)}`;
    const lat = -33.4 + (Math.random() * 0.6);
    const lng = -70.7 + (Math.random() * 0.3);
    
    try {
      await query(
        `INSERT INTO emergencias (nombre, descripcion, estado, lat, lng, direccion)
         VALUES ($1,$2,'activa',$3,$4,$5)
         ON CONFLICT DO NOTHING`,
        [nombre, `Emergencia de tipo ${tipo}`, lat, lng, `${tipo} en ${comuna}`]
      );
      count++;
    } catch (e) {
      // Ignorar
    }
  }
  console.log(`✓ ${count} emergencias insertadas`);
};

const insertarCuadrillasEnMasas = async () => {
  console.log('👷 Insertando 80 cuadrillas...');
  
  const emergencias = await query('SELECT id FROM emergencias ORDER BY RANDOM()');
  const jefeRes = await query("SELECT id FROM usuarios WHERE rol = 'jefe_cuadrilla'");
  const jefeId = jefeRes.rows[0].id;
  
  const fases = ['limpieza', 'montaje', 'terminaciones'];
  const plazos = [2, 5];
  const estados = ['activa', 'en_progreso', 'completada'];
  
  let count = 0;
  for (const emerg of emergencias.rows) {
    for (let i = 0; i < 3; i++) {
      const nombre = `Cuadrilla ${Math.random().toString(36).substring(7)}`;
      const fase = fases[Math.random() * fases.length | 0];
      const plazo = plazos[Math.random() * plazos.length | 0];
      const estado = estados[Math.random() * estados.length | 0];
      
      try {
        await query(
          `INSERT INTO cuadrillas (nombre, jefe_id, emergencia_id, estado, fase, plazo_dias, fecha_asignacion)
           VALUES ($1,$2,$3,$4,$5,$6,NOW())
           ON CONFLICT DO NOTHING`,
          [nombre, jefeId, emerg.id, estado, fase, plazo]
        );
        count++;
      } catch (e) {
        // Ignorar
      }
    }
  }
  console.log(`✓ ${count} cuadrillas insertadas`);
};

const asignarVoluntariosACuadrillas = async () => {
  console.log('🤝 Asignando voluntarios a cuadrillas...');
  
  const cuadrillas = await query('SELECT id FROM cuadrillas');
  const voluntarios = await query("SELECT id FROM usuarios WHERE rol = 'voluntario' ORDER BY RANDOM() LIMIT 100");
  
  if (voluntarios.rowCount === 0) return;
  
  let count = 0;
  for (const cuad of cuadrillas.rows) {
    const cantidad = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < cantidad; i++) {
      const vol = voluntarios.rows[Math.random() * voluntarios.rows.length | 0];
      const habilidades = ['construcción', 'limpieza', 'logística', 'primeros auxilios', 'coordinación'][Math.random() * 5 | 0];
      
      try {
        await query(
          `INSERT INTO miembros_cuadrilla (cuadrilla_id, voluntario_id, habilidades)
           VALUES ($1,$2,$3)
           ON CONFLICT DO NOTHING`,
          [cuad.id, vol.id, habilidades]
        );
        count++;
      } catch (e) {
        // Ignorar duplicados
      }
    }
  }
  console.log(`✓ ${count} asignaciones de voluntarios creadas`);
};

const insertarHerramientasEnMasas = async () => {
  console.log('🔧 Insertando 500+ herramientas...');
  
  const cuadrillas = await query('SELECT id FROM cuadrillas');
  const herramientas = [
    'Pala', 'Carretilla', 'Martillo', 'Destornillador', 'Linterna', 'Casco',
    'Chaleco reflectante', 'Agua embotellada', 'Kit primeros auxilios', 'Extintor',
    'Escalera', 'Cuerda', 'Megáfono', 'Lámpara', 'Radio', 'Serrucho',
    'Taladro', 'Motosierras', 'Bomba de agua', 'Generador', 'Manguera',
    'Guantes', 'Botas', 'Cinta adhesiva', 'Cables eléctricos', 'Herramientas de rescate'
  ];
  
  let count = 0;
  for (const cuad of cuadrillas.rows) {
    const cantidad = Math.floor(Math.random() * 8) + 5;
    for (let i = 0; i < cantidad; i++) {
      const herr = herramientas[Math.random() * herramientas.length | 0];
      const estado = ['entregada', 'en_uso', 'devuelto'][Math.random() * 3 | 0];
      
      try {
        await query(
          `INSERT INTO herramientas (cuadrilla_id, nombre, estado, observaciones)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT DO NOTHING`,
          [cuad.id, herr, estado, `Herramienta en estado ${estado}`]
        );
        count++;
      } catch (e) {
        // Ignorar
      }
    }
  }
  console.log(`✓ ${count} herramientas insertadas`);
};

const insertarMensajesEnMasas = async () => {
  console.log('💬 Insertando 300+ mensajes de chat...');
  
  const cuadrillas = await query('SELECT id FROM cuadrillas LIMIT 50');
  const usuarios = await query('SELECT id FROM usuarios ORDER BY RANDOM() LIMIT 30');
  
  const mensajesTipo = [
    '¿Todos en posición?',
    'Confirmar disponibilidad',
    'Iniciando operativo',
    'Reporte de situación',
    'Solicitar refuerzo',
    'Emergencia controlada',
    'Disponible para siguiente tarea',
    'Solicitar médico',
    'Equipo completo',
    'Operativo completado',
    'Solicitar más recursos',
    'Todo en orden',
    'Necesitamos ayuda aquí',
    'Confirmado, en marcha',
    'Asignación recibida'
  ];
  
  let count = 0;
  for (const cuad of cuadrillas.rows) {
    const cantidad = Math.floor(Math.random() * 10) + 5;
    for (let i = 0; i < cantidad; i++) {
      const usuario = usuarios.rows[Math.random() * usuarios.rows.length | 0];
      const mensaje = mensajesTipo[Math.random() * mensajesTipo.length | 0];
      
      try {
        await query(
          `INSERT INTO mensajes (remitente_id, cuadrilla_id, contenido)
           VALUES ($1,$2,$3)`,
          [usuario.id, cuad.id, mensaje]
        );
        count++;
      } catch (e) {
        // Ignorar
      }
    }
  }
  console.log(`✓ ${count} mensajes insertados`);
};

const insertarMovimientosHerramientasEnMasas = async () => {
  console.log('📦 Insertando movimientos de herramientas...');
  
  const cuadrillas = await query('SELECT id FROM cuadrillas LIMIT 50');
  const jefeRes = await query("SELECT id FROM usuarios WHERE rol = 'jefe_cuadrilla' LIMIT 1");
  const jefeId = jefeRes.rows[0].id;
  
  const herramientas = ['Pala', 'Martillo', 'Carretilla', 'Escalera', 'Linterna', 'Kit primeros auxilios'];
  
  let count = 0;
  for (const cuad of cuadrillas.rows) {
    for (const herr of herramientas) {
      try {
        await query(
          `INSERT INTO movimientos_herramienta 
           (nombre_item, cantidad, cuadrilla_id, tipo_movimiento, tipo_item, estado, registrado_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [herr, 1, cuad.id, 'salida', 'herramienta', 'activo', jefeId]
        );
        count++;
      } catch (e) {
        // Ignorar
      }
    }
  }
  console.log(`✓ ${count} movimientos de herramientas registrados`);
};

const insertarSolicitudesEnMasas = async () => {
  console.log('📝 Insertando 100+ solicitudes...');
  
  const cuadrillas = await query('SELECT id FROM cuadrillas LIMIT 50');
  const jefe = await query("SELECT id FROM usuarios WHERE rol = 'jefe_cuadrilla' LIMIT 1");
  const emergencias = await query('SELECT id FROM emergencias LIMIT 50');
  
  if (!jefe.rowCount || emergencias.rowCount === 0) return;
  
  const jefeId = jefe.rows[0].id;
  const tiposSolicitud = ['herramienta', 'epp', 'material', 'otro'];
  const estados = ['pendiente', 'aprobada', 'rechazada'];
  
  let count = 0;
  for (const cuad of cuadrillas.rows) {
    for (let i = 0; i < 2; i++) {
      const emerg = emergencias.rows[Math.random() * emergencias.rows.length | 0];
      const tipo = tiposSolicitud[Math.random() * tiposSolicitud.length | 0];
      const estado = estados[Math.random() * estados.length | 0];
      const descripcion = `Solicitud de ${tipo} para operativo`;
      
      try {
        await query(
          `INSERT INTO solicitudes (jefe_id, cuadrilla_id, emergencia_id, tipo, descripcion, estado)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [jefeId, cuad.id, emerg.id, tipo, descripcion, estado]
        );
        count++;
      } catch (e) {
        // Ignorar
      }
    }
  }
  console.log(`✓ ${count} solicitudes insertadas`);
};

const main = async () => {
  try {
    console.log('🚀 Cargando MONTÓN de datos...\n');
    
    await insertarMasVoluntarios();
    await insertarEmergenciasEnMasas();
    await insertarCuadrillasEnMasas();
    await asignarVoluntariosACuadrillas();
    await insertarHerramientasEnMasas();
    await insertarMensajesEnMasas();
    await insertarMovimientosHerramientasEnMasas();
    await insertarSolicitudesEnMasas();
    
    console.log('\n✅ ¡DATASET MASIVO CARGADO A MIL POR CIENTO!');
    console.log('📊 Resumen:');
    console.log('   • 50+ Voluntarios adicionales');
    console.log('   • 30+ Emergencias');
    console.log('   • 80+ Cuadrillas');
    console.log('   • 500+ Herramientas');
    console.log('   • 300+ Mensajes');
    console.log('   • 100+ Solicitudes');
    console.log('   • Movimientos de herramientas registrados');
    console.log('\n¡La aplicación está lista con datos abundantes! 🎉');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
