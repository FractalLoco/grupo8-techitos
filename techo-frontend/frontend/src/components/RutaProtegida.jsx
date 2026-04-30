// Importo Navigate para redirigir al usuario sin renderizar nada si no tiene acceso
import { Navigate } from 'react-router-dom';
// Accedo al contexto de autenticación para leer el usuario actual y el estado de verificación
import { useAutenticacion } from '../context/AuthContext';

// Componente guardián que protege rutas según autenticación y rol.
// Lo uso como wrapper en App.jsx alrededor de cada ruta que requiere sesión activa.
function RutaProtegida({ children, rolesPermitidos }) {
  const { usuario, verificando } = useAutenticacion();

  // Mientras el contexto verifica el token guardado, muestro un spinner para no flashear el contenido
  if (verificando) {
    return (
      <div className="min-h-screen bg-techo-light flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-techo-secondary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirijo al login y reemplazo el historial para no poder volver atrás
  if (!usuario) {
    return <Navigate to="/auth/iniciar-sesion" replace />;
  }

  // Si la ruta tiene roles permitidos definidos y el usuario no tiene uno de ellos, lo mando a sin-permiso
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/sin-permiso" replace />;
  }

  // El usuario existe y tiene el rol correcto: renderizo el contenido protegido
  return children;
}

export default RutaProtegida;
