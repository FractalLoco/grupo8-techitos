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
