-- Crear tabla de usuarios
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  rut VARCHAR(12) UNIQUE NOT NULL,
  correo VARCHAR(100) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  rol VARCHAR(20) CHECK (rol IN ('coordinador', 'jefe_cuadrilla', 'voluntario')) NOT NULL,
  activo BOOLEAN DEFAULT false,
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Contraseña de todos los usuarios de prueba: techo123
INSERT INTO usuarios (nombre, rut, correo, contrasena, rol, activo)
VALUES
  ('Coordinador Principal', '12345678-9', 'coordinador@techo.cl', '$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq', 'coordinador',    true),
  ('Jefe Cuadrilla Uno',   '98765432-1', 'jefe@techo.cl',        '$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq', 'jefe_cuadrilla', true),
  ('Voluntario Uno',       '11111111-1', 'voluntario@techo.cl',  '$2a$10$NqfrbruW3XscJjc/uKeQLeLFTyQLnNOsBULwJdztcmIis47so2Seq', 'voluntario',     true);

-- Historial de auditorías de usuarios y emergencias
CREATE TABLE IF NOT EXISTS auditorias (
  id SERIAL PRIMARY KEY,
  modulo VARCHAR(30) NOT NULL CHECK (modulo IN ('usuarios', 'emergencias')),
  accion VARCHAR(60) NOT NULL,
  entidad_id INTEGER,
  entidad_nombre VARCHAR(180),
  actor_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  actor_nombre VARCHAR(120),
  actor_rol VARCHAR(40),
  descripcion TEXT,
  detalles JSONB,
  creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditorias_modulo ON auditorias(modulo);
CREATE INDEX IF NOT EXISTS idx_auditorias_accion ON auditorias(accion);
CREATE INDEX IF NOT EXISTS idx_auditorias_creado_en ON auditorias(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_auditorias_actor_usuario ON auditorias(actor_usuario_id);
