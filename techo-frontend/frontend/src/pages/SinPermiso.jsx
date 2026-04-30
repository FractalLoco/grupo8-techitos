// Importo useNavigate para poder redirigir programáticamente y Link para navegar al inicio
import { useNavigate, Link } from 'react-router-dom';
// Accedo al usuario actual para mostrar su rol y a cerrarSesion para limpiar el estado
import { useAutenticacion } from '../context/AuthContext';

// Página de error 403 que aparece cuando RutaProtegida detecta que el rol del usuario
// no está entre los permitidos para acceder a esa sección.
function SinPermiso() {
  const navegar = useNavigate();
  const { usuario, cerrarSesion } = useAutenticacion();

  // Limpio la sesión completamente y redirijo al login
  const manejarCerrarSesion = () => {
    cerrarSesion();
    navegar('/auth/iniciar-sesion');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-techo-danger via-red-700 to-techo-danger items-center justify-center px-6">
      <div className="text-center animate-fadeIn">
        {/* Código de error grande como elemento visual de fondo */}
        <p className="text-8xl font-black text-white/20 mb-4">403</p>

        <h1 className="text-3xl font-bold text-white mb-2">Acceso Denegado</h1>

        <p className="text-red-100 text-lg mb-2">
          No tienes permiso para acceder a esta sección.
        </p>

        {/* Muestro el rol actual del usuario para que entienda por qué fue bloqueado */}
        {usuario && (
          <p className="text-red-200 text-sm mb-8">
            Tu rol actual es: <strong>{usuario.rol.replace('_', ' ')}</strong>
          </p>
        )}

        {/* Si no hay usuario, agrego un espaciado para mantener el layout balanceado */}
        {!usuario && <div className="mb-8"></div>}

        {/* Ofrezco tres opciones: volver atrás, cerrar sesión o ir al inicio */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            className="px-6 py-3 bg-white text-techo-danger rounded-lg font-semibold hover:bg-red-50 transition-all shadow-lg"
            onClick={() => navegar(-1)}
          >
            Volver atrás
          </button>
          <button
            className="px-6 py-3 bg-white/20 text-white border border-white/30 rounded-lg font-semibold hover:bg-white/30 transition-all"
            onClick={manejarCerrarSesion}
          >
            Cerrar sesión
          </button>
          <Link
            to="/inicio"
            className="px-6 py-3 bg-white/10 text-white border border-white/25 rounded-lg font-semibold hover:bg-white/20 transition-all"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SinPermiso;
