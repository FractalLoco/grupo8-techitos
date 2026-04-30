# Dashboard Multifuncional — TECHO Chile

Sistema web interno para la gestión de voluntarios y operaciones de TECHO Chile. Permite el acceso diferenciado por roles (coordinador, jefe de cuadrilla y voluntario) con autenticación segura mediante JWT.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Base de datos | PostgreSQL |
| Backend | Node.js + Express |
| Frontend | React 18 + Vite |
| Autenticación | JWT + bcrypt |

## Estructura del proyecto

```
/
├── techo-backend/
│   └── backend/
│       ├── config/          # Conexión a PostgreSQL
│       ├── controllers/     # Lógica de negocio
│       ├── middleware/      # Verificación de token y roles
│       ├── models/          # Consultas SQL
│       ├── routes/          # Definición de rutas
│       ├── validations/     # Validación de datos de entrada
│       ├── baseDatos.sql    # Script de creación de tablas y datos de prueba
│       ├── index.js         # Punto de entrada del servidor
│       └── .env             # Variables de entorno (ver .env.example)
│
└── techo-frontend/
    └── frontend/
        ├── src/
        │   ├── components/  # Navbar, RutaProtegida
        │   ├── context/     # AuthContext (sesión global)
        │   ├── pages/       # Login, Inicio, SinPermiso, NotFound
        │   └── services/    # Llamadas al backend (fetch)
        └── .env             # Variables de entorno (ver .env.example)
```

## Instalación y puesta en marcha

### Requisitos previos

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Base de datos

Crear la base de datos y ejecutar el script de inicialización:

```bash
createdb -U postgres techo_db
psql -U postgres -d techo_db -f techo-backend/backend/baseDatos.sql
```

> Si ya tienes una base de datos existente, ajusta el nombre en el archivo `.env` del backend.

### 2. Backend

```bash
cd techo-backend/backend
npm install
```

Copia el archivo de ejemplo y configura tus variables:

```bash
cp .env.example .env
```

Edita `.env` con tus datos de PostgreSQL:

```env
PUERTO=3000

DB_USUARIO=postgres
DB_HOST=localhost
DB_NOMBRE=techo_db
DB_CONTRASENA=tu_contraseña
DB_PUERTO=5432

SECRETO_JWT=cadena_larga_y_aleatoria_aqui
```

Inicia el servidor:

```bash
npm run dev      # desarrollo (nodemon)
npm start        # producción
```

El backend queda disponible en `http://localhost:3000`.

### 3. Frontend

```bash
cd techo-frontend/frontend
npm install
```

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Edita `.env` si tu backend corre en un puerto distinto:

```env
VITE_URL_BACKEND=http://localhost:3000
```

Inicia la aplicación:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Usuarios de prueba

Todos los usuarios de prueba usan la misma contraseña: **`techo123`**

| RUT | Rol | Acceso |
|-----|-----|--------|
| `12345678-9` | Coordinador | Panel completo |
| `98765432-1` | Jefe de Cuadrilla | Panel de cuadrilla |
| `11111111-1` | Voluntario | Panel básico |

## API — Endpoints disponibles

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/auth/iniciar-sesion` | Público | Inicia sesión y devuelve un JWT |
| `GET` | `/auth/verificar` | Autenticado | Verifica si el token sigue activo |
| `GET` | `/auth/solo-coordinador` | Coordinador | Ruta de prueba para rol coordinador |
| `GET` | `/auth/solo-jefe` | Coordinador / Jefe | Ruta de prueba para jefe de cuadrilla |

### Ejemplo de login

```bash
curl -X POST http://localhost:3000/auth/iniciar-sesion \
  -H "Content-Type: application/json" \
  -d '{"rut": "12345678-9", "contrasena": "techo123"}'
```

Respuesta:

```json
{
  "estado": "exitoso",
  "codigo": 200,
  "mensaje": "Sesión iniciada correctamente",
  "datos": {
    "token": "eyJhbGci...",
    "usuario": {
      "id": 1,
      "nombre": "Coordinador Principal",
      "rol": "coordinador"
    }
  }
}
```

### Rutas protegidas

Incluir el token en el encabezado `Authorization`:

```
Authorization: Bearer <token>
```

## Variables de entorno

### Backend (`.env`)

| Variable | Descripción |
|----------|-------------|
| `PUERTO` | Puerto en que escucha el servidor |
| `DB_USUARIO` | Usuario de PostgreSQL |
| `DB_HOST` | Host de la base de datos |
| `DB_NOMBRE` | Nombre de la base de datos |
| `DB_CONTRASENA` | Contraseña de PostgreSQL |
| `DB_PUERTO` | Puerto de PostgreSQL (por defecto 5432) |
| `SECRETO_JWT` | Clave secreta para firmar los tokens JWT |

### Frontend (`.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_URL_BACKEND` | URL base del backend |

## Sistema de roles

```
coordinador
  └── acceso total

jefe_cuadrilla
  └── acceso a gestión de cuadrilla

voluntario
  └── acceso básico
```

Las rutas del frontend están protegidas por el componente `RutaProtegida`, que verifica el token y el rol antes de renderizar la página. Si el token venció, redirige al login. Si el rol no alcanza, redirige a `/sin-permiso`.

---

## Licencia y derechos de autor

**© 2025 Grupo 8 — Ingeniería de Software**

Este proyecto fue desarrollado con fines **estrictamente académicos** como parte del curso de Ingeniería de Software. Corresponde a un caso hipotético y no representa una solución comercial real.

**Todos los derechos reservados.** Queda prohibida la reproducción, distribución, modificación o uso comercial total o parcial de este proyecto sin autorización expresa y por escrito de sus autores.

Cualquier consulta relacionada con el uso, integración, adaptación o comercialización de este software debe ser dirigida directamente a los alumnos integrantes del Grupo 8.

> Este repositorio es de carácter educativo. Su existencia pública tiene como único propósito la evaluación académica y la demostración de competencias en el desarrollo de software.
