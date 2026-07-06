import { useNavigate, useLocation } from 'react-router-dom';
import { MdArrowBack, MdHome } from 'react-icons/md';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageName = () => {
    const path = location.pathname;
    const names = {
      '/inicio': 'Inicio',
      '/cuadrillas': 'Gestión de Cuadrillas',
      '/mapa': 'Mapa Interactivo',
      '/herramientas': 'Control de Herramientas',
      '/inventario': 'Inventario',
      '/solicitudes': 'Solicitudes de Herramientas',
      '/emergencias': 'Gestión de Emergencias',
      '/comunicaciones': 'Comunicaciones',
      '/usuarios': 'Gestión de Usuarios',
      '/reportes': 'Reportes',
    };
    return names[path] || '';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[3000] bg-primary-dark shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/inicio')}
          className="flex items-center gap-2 min-h-11 px-3 rounded-xl hover:bg-white/10 transition text-white/80 hover:text-white"
          aria-label="Volver al inicio"
        >
          <MdArrowBack size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src="/logo.svg"
            alt="TECHO"
            className="h-8 w-auto"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="h-5 w-px bg-white/20" />
          <span className="text-white font-semibold text-sm truncate max-w-[200px]">
            {getPageName()}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/inicio')}
          className="ml-auto flex items-center gap-1.5 min-h-11 px-3 rounded-xl hover:bg-white/10 transition text-white/60 hover:text-white text-xs font-semibold"
        >
          <MdHome size={16} />
          Inicio
        </button>
      </div>
    </nav>
  );
}
