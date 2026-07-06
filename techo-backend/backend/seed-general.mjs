'use strict';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PUERTO) || 5432,
  user: process.env.DB_USUARIO || 'postgres',
  password: process.env.DB_CONTRASENA || '5235',
  database: process.env.DB_NOMBRE || 'test3',
});

const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result;
};

const getUsuarioId = async (rut) => {
  const res = await query('SELECT id FROM usuarios WHERE rut = $1', [rut]);
  if (!res.rowCount) throw new Error(`Usuario con rut ${rut} no encontrado`);
  return res.rows[0].id;
};

const getVoluntarios = async () => {
  const res = await query("SELECT id FROM usuarios WHERE rol = 'voluntario' ORDER BY id");
  if (!res.rowCount) throw new Error('No hay voluntarios registrados');
  return res.rows.map((row) => row.id);
};

const ensureEmergencia = async () => {
  const nombre = 'Emergencia de práctica';
  const existente = await query('SELECT id FROM emergencias WHERE nombre = $1', [nombre]);
  if (existente.rowCount) return existente.rows[0].id;

  const insert = await query(
    `INSERT INTO emergencias (nombre, descripcion, estado, direccion, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      nombre,
      'Emergencia creada para ejercicios de prueba y entrenamiento en la plataforma',
      'activa',
      'Av. Prueba 1000, Santiago',
      -33.4520,
      -70.6650,
    ]
  );
  return insert.rows[0].id;
};

const ensureFamilias = async (emergenciaId) => {
  const familias = [
    {
      nombre: 'Familia Pérez',
      direccion: 'Calle Esperanza 123',
      lat: -33.4511,
      lng: -70.6662,
      miembros: 5,
      prioridad: 'alta',
    },
    {
      nombre: 'Familia Gutiérrez',
      direccion: 'Pasaje Libertad 45',
      lat: -33.4533,
      lng: -70.6638,
      miembros: 4,
      prioridad: 'normal',
    },
    {
      nombre: 'Familia Morales',
      direccion: 'Av. Mundo 678',
      lat: -33.4495,
      lng: -70.6685,
      miembros: 6,
      prioridad: 'baja',
    },
  ];

  const results = [];
  for (const familia of familias) {
    const existente = await query(
      `SELECT id FROM familias WHERE nombre_cabeza_familia = $1 AND emergencia_id = $2`,
      [familia.nombre, emergenciaId]
    );
    if (existente.rowCount) {
      results.push(existente.rows[0].id);
      continue;
    }

    const insert = await query(
      `INSERT INTO familias (emergencia_id, nombre_cabeza_familia, direccion, lat, lng, miembros, prioridad)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        emergenciaId,
        familia.nombre,
        familia.direccion,
        familia.lat,
        familia.lng,
        familia.miembros,
        familia.prioridad,
      ]
    );
    results.push(insert.rows[0].id);
  }

  return results;
};

const ensureObras = async (emergenciaId) => {
  const obras = [
    {
      nombre: 'Limpieza sector oeste',
      descripcion: 'Retiro de escombros y limpieza de vías en el sector oeste',
      direccion: 'Camino Viejo 12',
      lat: -33.4500,
      lng: -70.6670,
    },
    {
      nombre: 'Reparación de techo comunitario',
      descripcion: 'Trabajo en techos y refuerzo estructural de la sede vecinal',
      direccion: 'Plaza Central 5',
      lat: -33.4530,
      lng: -70.6640,
    },
  ];

  const result = [];
  for (const obra of obras) {
    const existente = await query('SELECT id FROM obras WHERE nombre = $1 AND emergencia_id = $2', [obra.nombre, emergenciaId]);
    if (existente.rowCount) {
      result.push(existente.rows[0].id);
      continue;
    }

    const insert = await query(
      `INSERT INTO obras (nombre, descripcion, direccion, lat, lng, emergencia_id, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [obra.nombre, obra.descripcion, obra.direccion, obra.lat, obra.lng, emergenciaId, 'disponible']
    );
    result.push(insert.rows[0].id);
  }

  return result;
};

const ensureCuadrillas = async (emergenciaId, jefeId, obraIds) => {
  const cuadrillas = [
    {
      nombre: 'Cuadrilla Norte',
      jefe_id: jefeId,
      obra_asignada_id: obraIds[0],
      fase: 'limpieza',
      plazo_dias: 2,
      estado: 'activa',
    },
    {
      nombre: 'Cuadrilla Sur',
      jefe_id: jefeId,
      obra_asignada_id: obraIds[1],
      fase: 'montaje',
      plazo_dias: 5,
      estado: 'activa',
    },
  ];

  const result = [];
  for (const cuadrilla of cuadrillas) {
    const existente = await query('SELECT id FROM cuadrillas WHERE nombre = $1 AND emergencia_id = $2', [cuadrilla.nombre, emergenciaId]);
    if (existente.rowCount) {
      result.push(existente.rows[0].id);
      continue;
    }

    const insert = await query(
      `INSERT INTO cuadrillas (nombre, jefe_id, emergencia_id, obra_asignada_id, estado, fase, plazo_dias, fecha_asignacion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       RETURNING id`,
      [
        cuadrilla.nombre,
        cuadrilla.jefe_id,
        emergenciaId,
        cuadrilla.obra_asignada_id,
        cuadrilla.estado,
        cuadrilla.fase,
        cuadrilla.plazo_dias,
      ]
    );
    result.push(insert.rows[0].id);
  }

  return result;
};

const ensureMiembrosCuadrilla = async (cuadrillaIds, voluntarios) => {
  const assignments = [
    { cuadrillaId: cuadrillaIds[0], voluntarioId: voluntarios[0], habilidades: 'manejo de maquinaria ligera' },
    { cuadrillaId: cuadrillaIds[0], voluntarioId: voluntarios[1], habilidades: 'revisión estructural' },
    { cuadrillaId: cuadrillaIds[1], voluntarioId: voluntarios[2], habilidades: 'electricidad básica' },
    { cuadrillaId: cuadrillaIds[1], voluntarioId: voluntarios[3], habilidades: 'first aid' },
  ];

  for (const assignment of assignments) {
    const existe = await query(
      `SELECT id FROM miembros_cuadrilla WHERE cuadrilla_id = $1 AND voluntario_id = $2`,
      [assignment.cuadrillaId, assignment.voluntarioId]
    );
    if (existe.rowCount) continue;

    await query(
      `INSERT INTO miembros_cuadrilla (cuadrilla_id, voluntario_id, habilidades)
       VALUES ($1,$2,$3)`,
      [assignment.cuadrillaId, assignment.voluntarioId, assignment.habilidades]
    );
  }
};

const ensureHerramientas = async (cuadrillaIds) => {
  const herramientas = [
    { cuadrillaId: cuadrillaIds[0], nombre: 'Pala', estado: 'entregada' },
    { cuadrillaId: cuadrillaIds[0], nombre: 'Carretilla', estado: 'entregada' },
    { cuadrillaId: cuadrillaIds[1], nombre: 'Destornillador', estado: 'entregada' },
    { cuadrillaId: cuadrillaIds[1], nombre: 'Martillo', estado: 'entregada' },
  ];

  for (const herramienta of herramientas) {
    const existe = await query(
      `SELECT id FROM herramientas WHERE cuadrilla_id = $1 AND nombre = $2`,
      [herramienta.cuadrillaId, herramienta.nombre]
    );
    if (existe.rowCount) continue;

    await query(
      `INSERT INTO herramientas (cuadrilla_id, nombre, estado, observaciones)
       VALUES ($1,$2,$3,$4)`,
      [herramienta.cuadrillaId, herramienta.nombre, herramienta.estado, 'Entregada en inicio de turno']
    );
  }
};

const ensureSolicitudes = async (jefeId, cuadrillaIds, emergenciaId) => {
  const solicitudes = [
    {
      tipo: 'herramienta',
      descripcion: 'Solicito 2 palas adicionales para limpieza de escombros',
      estado: 'pendiente',
      respuesta: null,
      cuadrillaId: cuadrillaIds[0],
    },
    {
      tipo: 'epp',
      descripcion: 'Solicito chalecos reflectantes para la cuadrilla',
      estado: 'aprobada',
      respuesta: 'Aprobado por coordinar entrega mañana',
      cuadrillaId: cuadrillaIds[1],
    },
  ];

  for (const solicitud of solicitudes) {
    const existe = await query(
      `SELECT id FROM solicitudes WHERE jefe_id = $1 AND cuadrilla_id = $2 AND tipo = $3 AND emergencia_id = $4`,
      [jefeId, solicitud.cuadrillaId, solicitud.tipo, emergenciaId]
    );
    if (existe.rowCount) continue;

    await query(
      `INSERT INTO solicitudes (jefe_id, cuadrilla_id, emergencia_id, tipo, descripcion, estado, respuesta)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [jefeId, solicitud.cuadrillaId, emergenciaId, solicitud.tipo, solicitud.descripcion, solicitud.estado, solicitud.respuesta]
    );
  }
};

const ensureEvaluaciones = async (emergenciaId, familiaIds) => {
  const evaluaciones = [
    {
      familiaId: familiaIds[0],
      estado: 'completada',
      observaciones: 'Necesitan agua potable y mantas térmicas',
    },
    {
      familiaId: familiaIds[1],
      estado: 'en_proceso',
      observaciones: 'Se solicitó evaluación médica adicional',
    },
  ];

  for (const evaluacion of evaluaciones) {
    const existe = await query(
      `SELECT id FROM evaluaciones WHERE familia_id = $1 AND emergencia_id = $2`,
      [evaluacion.familiaId, emergenciaId]
    );
    if (existe.rowCount) continue;

    await query(
      `INSERT INTO evaluaciones (emergencia_id, familia_id, estado, observaciones)
       VALUES ($1,$2,$3,$4)`,
      [emergenciaId, evaluacion.familiaId, evaluacion.estado, evaluacion.observaciones]
    );
  }
};

const ensureZonasPeligro = async (emergenciaId, creadorId) => {
  const zonas = [
    {
      tipo: 'roja',
      lat: -33.4538,
      lng: -70.6665,
      radio: 300,
      descripcion: 'Zona de derrumbe con acceso prohibido',
      comentarios: 'Se recomienda desviar todo el tránsito',
    },
    {
      tipo: 'amarilla',
      lat: -33.4517,
      lng: -70.6648,
      radio: 180,
      descripcion: 'Sector inundado parcialmente',
      comentarios: 'Precaución con equipos de limpieza',
    },
  ];

  for (const zona of zonas) {
    const existe = await query(
      `SELECT id FROM zonas_peligro WHERE emergencia_id = $1 AND tipo = $2 AND lat = $3 AND lng = $4`,
      [emergenciaId, zona.tipo, zona.lat, zona.lng]
    );
    if (existe.rowCount) continue;

    await query(
      `INSERT INTO zonas_peligro (emergencia_id, tipo, lat, lng, radio, descripcion, comentarios, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [emergenciaId, zona.tipo, zona.lat, zona.lng, zona.radio, zona.descripcion, zona.comentarios, creadorId]
    );
  }
};

const ensureNotificaciones = async (usuarios) => {
  const notis = [
    {
      usuarioId: usuarios.jefe,
      titulo: 'Asignación de obra pendiente',
      mensaje: 'Revisa la obra asignada y confirma el equipo en terreno.',
      tipo: 'asignacion_obra',
    },
    {
      usuarioId: usuarios.voluntarios[0],
      titulo: 'Nueva tarea',
      mensaje: 'Participar en limpieza del sector oeste en 30 minutos.',
      tipo: 'reasignacion',
    },
    {
      usuarioId: usuarios.voluntarios[1],
      titulo: 'Alerta de herramienta',
      mensaje: 'Verifica el estado del martillo y el destornillador al cierre.',
      tipo: 'alerta_herramienta',
    },
  ];

  for (const noti of notis) {
    const existe = await query(
      `SELECT id FROM notificaciones WHERE usuario_id = $1 AND titulo = $2`,
      [noti.usuarioId, noti.titulo]
    );
    if (existe.rowCount) continue;

    await query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo)
       VALUES ($1,$2,$3,$4)`,
      [noti.usuarioId, noti.titulo, noti.mensaje, noti.tipo]
    );
  }
};

const main = async () => {
  try {
    const coordinadorId = await getUsuarioId('12345678-9');
    const jefeId = await getUsuarioId('11111111-1');
    const voluntarios = await getVoluntarios();

    const emergenciaId = await ensureEmergencia();
    const familiaIds = await ensureFamilias(emergenciaId);
    const obraIds = await ensureObras(emergenciaId);
    const cuadrillaIds = await ensureCuadrillas(emergenciaId, jefeId, obraIds);
    await ensureMiembrosCuadrilla(cuadrillaIds, voluntarios);
    await ensureHerramientas(cuadrillaIds);
    await ensureSolicitudes(jefeId, cuadrillaIds, emergenciaId);
    await ensureEvaluaciones(emergenciaId, familiaIds);
    await ensureZonasPeligro(emergenciaId, coordinadorId);
    await ensureNotificaciones({ jefe: jefeId, voluntarios });

    console.log('Seed general completado con éxito');
  } catch (error) {
    console.error('Error en seed general:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
