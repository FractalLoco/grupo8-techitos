import { Link } from 'react-router-dom';
import DashboardPublico from '../components/DashboardPublico';

/**
 * Página de presentación pública de TECHO.
 * Muestra el logo, una descripción de la organización, el dashboard
 * con métricas reales y dos llamadas a la acción (registro / inicio de sesión).
 * Diseño mobile-first, responsivo, sin campos de autenticación.
 */
function Presentacion() {
  return (
    <main className="min-h-screen bg-techo-light flex flex-col">
      {/* Sección superior: presentación */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-12 pb-8 sm:pt-16 sm:pb-10">
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Logo */}
          <img
            src="/logo-techo-color-oficial.svg"
            alt="TECHO Chile"
            className="w-52 sm:w-64 mx-auto mb-5"
            onError={(e) => (e.target.style.display = 'none')}
          />

          {/* Descripción */}
          <p className="text-sm sm:text-base text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed">
            TECHO trabaja junto a miles de voluntarios para construir viviendas de emergencia
            y transformar asentamientos informales en comunidades integradas.
            Este dashboard permite gestionar emergencias, coordinar cuadrillas y dar
            seguimiento a las obras en todo Chile.
          </p>
        </div>
      </section>

      {/* Sección del dashboard público */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-8 sm:pb-10" aria-label="Indicadores públicos">
        <div className="bg-white/90 border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="mb-1">
            <p className="text-xs text-gray-400">
              Estos indicadores se actualizan automáticamente a medida que las cuadrillas reportan avances en terreno.
            </p>
          </div>

          <DashboardPublico />
        </div>
      </section>

      {/* Sección de acciones */}
      <section className="w-full max-w-lg mx-auto px-4 pb-12 sm:pb-16 flex flex-col items-center gap-4">
        {/* Acción principal: Registro */}
        <div className="w-full bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-medium text-gray-500 mb-3">¿Quieres unirte?</p>
          <Link
            to="/auth/registro"
            className="inline-block w-full bg-techo-secondary hover:bg-techo-secondary/90 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-techo-secondary/50 focus:ring-offset-2"
          >
            Regístrate
          </Link>
        </div>

        {/* Acción secundaria: texto que lleva al login */}
        <Link
          to="/auth/iniciar-sesion"
          className="text-sm font-medium text-gray-400 hover:text-techo-primary transition-colors focus:outline-none focus:underline"
        >
          ¿Ya eres parte?
        </Link>
      </section>

      {/* Pie de página */}
      <footer className="text-center pb-6">
        <p className="text-xs text-gray-300">
          TECHO Chile — Dashboard Multifuncional
        </p>
      </footer>
    </main>
  );
}

export default Presentacion;
