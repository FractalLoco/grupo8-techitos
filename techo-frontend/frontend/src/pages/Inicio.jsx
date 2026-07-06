import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';

const etiquetaRol = {
  coordinador: 'Coordinador',
  jefe_cuadrilla: 'Jefe de Cuadrilla',
  voluntario: 'Voluntario',
};

const accesosPorRol = {
  coordinador: [
    { label: 'Gestión de Cuadrillas', path: '/cuadrillas', desc: 'Crear y administrar cuadrillas, asignar obras y voluntarios' },
    { label: 'Mapa de Emergencia', path: '/mapa', desc: 'Ver obras en el mapa, zonas de peligro y ubicación de cuadrillas' },
    { label: 'Herramientas', path: '/herramientas', desc: 'Registro diario de herramientas y balance de inventario' },
    { label: 'Emergencias', path: '/emergencias', desc: 'Administrar emergencias activas y familias afectadas' },
    { label: 'Comunicaciones', path: '/comunicaciones', desc: 'Mensajes de cuadrilla y anuncios generales' },
    { label: 'Usuarios', path: '/usuarios', desc: 'Activar cuentas y gestionar roles del equipo' },
    { label: 'Reportes', path: '/reportes', desc: 'Generar reportes PDF con snapshot de datos de emergencia' },
  ],
  jefe_cuadrilla: [
    { label: 'Mi Cuadrilla', path: '/cuadrillas', desc: 'Ver el estado de tu cuadrilla, actualizar fase y enviar alertas' },
    { label: 'Mapa', path: '/mapa', desc: 'Ver la ubicación de tu obra y navegar hacia ella' },
    { label: 'Herramientas', path: '/herramientas', desc: 'Registrar y hacer balance de herramientas del día' },
    { label: 'Comunicaciones', path: '/comunicaciones', desc: 'Chat de tu cuadrilla y anuncios del coordinador' },
  ],
  voluntario: [
    { label: 'Mapa', path: '/mapa', desc: 'Ver tu obra asignada, la dirección exacta y cómo llegar' },
    { label: 'Cuadrillas', path: '/cuadrillas', desc: 'Ver el estado de las cuadrillas de la emergencia' },
    { label: 'Comunicaciones', path: '/comunicaciones', desc: 'Mensajes y anuncios de la emergencia' },
  ],
};

const iconosPorPath = {
  '/cuadrillas':    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  '/mapa':          'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  '/herramientas':  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  '/emergencias':   'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  '/comunicaciones':'M8 10h8m-8 4h5m-6 6h12a2 2 0 002-2v-6a2 2 0 00-2-2h-1l-3-3H7a2 2 0 00-2 2v9a2 2 0 002 2z',
  '/usuarios':      'M18 9a3 3 0 11-6 0 3 3 0 016 0zm-9 11a4 4 0 118 0H9zm-2-8a2 2 0 100-4 2 2 0 000 4z',
  '/inventario':    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  '/reportes':      'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

const coloresPorPath = {
  '/cuadrillas':    'from-primary to-primary-container',
  '/mapa':          'from-primary-container to-primary-container',
  '/herramientas':  'from-tertiary to-tertiary-container',
  '/emergencias':   'from-error to-error',
  '/comunicaciones':'from-tertiary to-primary-dark',
  '/usuarios':      'from-secondary to-secondary',
  '/inventario':    'from-outline to-on-surface-variant',
  '/reportes':      'from-tertiary to-tertiary',
};

export default function Inicio() {
  const { usuario } = useAutenticacion();

  const accesos = accesosPorRol[usuario?.rol] || [];
  const primerNombre = usuario?.nombre?.split(' ')[0] || 'Panel de Control';

  return (
    <div className="min-h-screen bg-surface-container-low">
      <Navbar />

      <div className="pt-[60px]">
        {/* Hero header */}
        <div className="bg-gradient-to-r from-primary via-primary-dark to-inverse-surface px-8 py-8">
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">
            {etiquetaRol[usuario?.rol] || 'Bienvenido'}
          </p>
          <h1 className="text-white font-black text-2xl tracking-tight">
            {primerNombre}
          </h1>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Accesos rápidos */}
          <div>
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-3 h-0.5 bg-primary-container rounded-full inline-block" />
              Accesos rápidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accesos.map((acceso, i) => (
                <Link
                  key={acceso.path}
                  to={acceso.path}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="group animate-fadeInUp bg-white rounded-2xl border border-outline-variant/60 p-5 flex flex-col gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 no-underline"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${coloresPorPath[acceso.path] || 'from-outline to-on-surface-variant'} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ width: '20px', height: '20px' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={iconosPorPath[acceso.path] || 'M13 10V3L4 14h7v7l9-11h-7z'}
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-on-surface text-sm">{acceso.label}</div>
                    <div className="text-xs text-outline mt-0.5 leading-relaxed">{acceso.desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all mt-auto">
                    Ir <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
