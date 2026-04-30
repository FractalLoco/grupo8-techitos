# Dashboard Multifuncional - TECHO Chile

## Instrucciones para correr el proyecto

### Base de datos
1. Crear la base de datos en PostgreSQL:
   ```
   createdb techo_db
   ```
2. Ejecutar el archivo SQL:
   ```
   psql -d techo_db -f baseDatos.sql
   ```

### Backend
1. Entrar a la carpeta backend:
   ```
   cd backend
   ```
2. Instalar dependencias:
   ```
   npm install
   ```
3. Correr el servidor:
   ```
   npm run dev
   ```
El servidor corre en: http://localhost:3000

### Frontend
1. Entrar a la carpeta frontend:
   ```
   cd frontend
   ```
2. Instalar dependencias:
   ```
   npm install
   ```
3. Correr la aplicacion:
   ```
   npm run dev
   ```
La aplicacion corre en: http://localhost:5173

### Usuario de prueba
- RUT: 12345678-9
- Contraseña: techo123
- Rol: coordinador
