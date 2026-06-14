import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';

const BASE_URL = 'http://localhost:3000/api';

const etiquetaRol = {
  coordinador: 'Coordinador',
  jefe_cuadrilla: 'Jefe de Cuadrilla',
  voluntario: 'Voluntario',
};

const accesosPorRol = {
  coordinador: [
    { label: 'Gestion de Cuadrillas', path: '/cuadrillas', desc: 'Crear y administrar cuadrillas, asignar obras y voluntarios' },
    { label: 'Mapa de Emergencia', path: '/mapa', desc: 'Ver obras en el mapa, zonas de peligro y ubicacion de cuadrillas' },
    { label: 'Herramientas', path: '/herramientas', desc: 'Registro diario de herramientas y balance de inventario' },
    { label: 'Emergencias', path: '/emergencias', desc: 'Administrar emergencias activas y familias afectadas' },
    { label: 'Comunicaciones', path: '/comunicaciones', desc: 'Mensajes de cuadrilla y anuncios generales' },
    { label: 'Usuarios', path: '/usuarios', desc: 'Activar cuentas y gestionar roles del equipo' },
  ],
  jefe_cuadrilla: [
    { label: 'Mi Cuadrilla', path: '/cuadrillas', desc: 'Ver el estado de tu cuadrilla, actualizar fase y enviar alertas' },
    { label: 'Mapa', path: '/mapa', desc: 'Ver la ubicacion de tu obra y navegar hacia ella' },
    { label: 'Herramientas', path: '/herramientas', desc: 'Registrar y hacer balance de herramientas del dia' },
    { label: 'Comunicaciones', path: '/comunicaciones', desc: 'Chat de tu cuadrilla y anuncios del coordinador' },
  ],
  voluntario: [
    { label: 'Mapa', path: '/mapa', desc: 'Ver tu obra asignada, la direccion exacta y como llegar' },
    { label: 'Cuadrillas', path: '/cuadrillas', desc: 'Ver el estado de las cuadrillas de la emergencia' },
    { label: 'Comunicaciones', path: '/comunicaciones', desc: 'Mensajes y anuncios de la emergencia' },
  ],
};

// Iconos SVG por seccion de acceso rapido
const iconosPorPath = {
  '/cuadrillas': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  '/mapa': 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  '/herramientas': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  '/emergencias': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  '/comunicaciones': 'M8 10h8m-8 4h5m-6 6h12a2 2 0 002-2v-6a2 2 0 00-2-2h-1l-3-3H7a2 2 0 00-2 2v9a2 2 0 002 2z',
  '/usuarios': 'M18 9a3 3 0 11-6 0 3 3 0 016 0zm-9 11a4 4 0 118 0H9zm-2-8a2 2 0 100-4 2 2 0 000 4z',
};

export default function Inicio() {
  const { usuario } = useAutenticacion();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/dashboard/publico`)
      .then((r) => r.json())
      .then((data) => {
        if (data.estado === 'exitoso') setStats(data.datos);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const accesos = accesosPorRol[usuario?.rol] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-[60px]">
        {/* Encabezado de pagina */}
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Panel de Control
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {etiquetaRol[usuario?.rol] || usuario?.rol}
            {usuario?.nombre ? ` — ${usuario.nombre}` : ''}
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Indicadores de actividad */}
          <div className="mb-8">
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Actividad del sistema
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TarjetaStat
                titulo="Cuadrillas activas"
                valor={cargando ? '—' : stats?.cuadrillas_activas ?? 0}
              />
              <TarjetaStat
                titulo="Voluntarios desplegados"
                valor={cargando ? '—' : stats?.voluntarios_desplegados ?? 0}
              />
              <TarjetaStat
                titulo="Obras finalizadas"
                valor={cargando ? '—' : stats?.casas_finalizadas ?? 0}
              />
            </div>
          </div>

          {/* Accesos rapidos */}
          <div>
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Accesos rapidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accesos.map((acceso) => (
                <Link
                  key={acceso.path}
                  to={acceso.path}
                  className="group flex items-start gap-4 bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-techo-primary hover:shadow-sm transition-all no-underline"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-md bg-gray-100 group-hover:bg-techo-primary flex items-center justify-center transition-colors mt-0.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4.5 w-4.5 text-gray-500 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ width: '18px', height: '18px' }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={iconosPorPath[acceso.path] || 'M13 10V3L4 14h7v7l9-11h-7z'}
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 group-hover:text-techo-primary transition-colors">
                      {acceso.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {acceso.desc}
                    </div>
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

function TarjetaStat({ titulo, valor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center gap-4">
      <div className="text-3xl font-bold text-techo-primary tabular-nums leading-none">
        {valor}
      </div>
      <div className="text-xs text-gray-500 leading-snug">
        {titulo}
      </div>
    </div>
  );
}
