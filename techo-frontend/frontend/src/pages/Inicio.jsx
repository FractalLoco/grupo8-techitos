import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../context/AuthContext';
import {
  contarNoLeidas,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from '../services/notificacionService';

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
    { label: 'Inventario', path: '/inventario', desc: 'Consultar y administrar el inventario disponible' },
    { label: 'Emergencias', path: '/emergencias', desc: 'Administrar emergencias activas y familias afectadas' },
    { label: 'Comunicaciones', path: '/comunicaciones', desc: 'Mensajes de cuadrilla y anuncios generales' },
    { label: 'Usuarios', path: '/usuarios', desc: 'Activar cuentas y gestionar roles del equipo' },
    { label: 'Registrar Usuario', path: '/auth/registro', desc: 'Crear una nueva cuenta para un integrante' },
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
  '/auth/registro': 'M18 9v3m0 0v3m0-3h3m-3 0h-3M13 7a4 4 0 11-8 0 4 4 0 018 0zM3 21a6 6 0 0112 0',
  '/inventario':    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  '/reportes':      'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

const coloresPorPath = {
  '/cuadrillas':    'from-techo-primary to-techo-secondary',
  '/mapa':          'from-techo-secondary to-cyan-600',
  '/herramientas':  'from-techo-accent to-orange-500',
  '/emergencias':   'from-techo-danger to-red-700',
  '/comunicaciones':'from-purple-600 to-indigo-700',
  '/usuarios':      'from-techo-success to-emerald-700',
  '/auth/registro': 'from-emerald-500 to-teal-700',
  '/inventario':    'from-slate-500 to-slate-700',
  '/reportes':      'from-techo-accent to-amber-600',
};

export default function Inicio() {
  const { usuario, cerrarSesion } = useAutenticacion();
  const navigate = useNavigate();
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState('');

  const accesos = accesosPorRol[usuario?.rol] || [];
  const primerNombre = usuario?.nombre?.split(' ')[0] || 'Panel de Control';

  const cargarNotificaciones = useCallback(async () => {
    setCargandoNotificaciones(true);
    setErrorNotificaciones('');
    try {
      const resultado = await listarNotificaciones();
      const lista = resultado?.notificaciones || resultado || [];
      setNotificaciones(Array.isArray(lista) ? lista : []);
    } catch (error) {
      setErrorNotificaciones(error.message || 'No se pudieron cargar las notificaciones');
    } finally {
      setCargandoNotificaciones(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    const actualizar = async () => {
      try {
        const total = await contarNoLeidas();
        if (activo) setNoLeidas(total);
      } catch {
        // El resto de Inicio debe seguir disponible si falla el contador.
      }
    };
    actualizar();
    const intervalo = window.setInterval(actualizar, 5000);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    if (!notificacionesAbiertas) return undefined;
    cargarNotificaciones();
    const intervalo = window.setInterval(cargarNotificaciones, 5000);
    return () => window.clearInterval(intervalo);
  }, [cargarNotificaciones, notificacionesAbiertas]);

  const abrirNotificaciones = () => {
    setNotificacionesAbiertas(true);
  };

  const leerNotificacion = async (notificacion) => {
    if (notificacion.leida) return;
    try {
      await marcarLeida(notificacion.id);
      setNotificaciones((actuales) => actuales.map((item) => (
        item.id === notificacion.id ? { ...item, leida: true } : item
      )));
      setNoLeidas((total) => Math.max(0, total - 1));
    } catch (error) {
      setErrorNotificaciones(error.message || 'No se pudo marcar la notificación');
    }
  };

  const leerTodas = async () => {
    try {
      await marcarTodasLeidas();
      setNotificaciones((actuales) => actuales.map((item) => ({ ...item, leida: true })));
      setNoLeidas(0);
    } catch (error) {
      setErrorNotificaciones(error.message || 'No se pudieron marcar las notificaciones');
    }
  };

  const salir = () => {
    cerrarSesion();
    navigate('/auth/iniciar-sesion', { replace: true });
  };

  const formatearFecha = (fecha) => fecha
    ? new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(fecha))
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div>
        {/* Hero header */}
        <div className="relative bg-gradient-to-r from-techo-primary via-techo-primaryDark to-techo-dark px-8 py-8">
          <p className="text-techo-secondary text-xs font-bold uppercase tracking-widest mb-1">
            {etiquetaRol[usuario?.rol] || 'Bienvenido'}
          </p>
          <h1 className="text-white font-black text-2xl tracking-tight">
            {primerNombre}
          </h1>
          <button
            type="button"
            onClick={abrirNotificaciones}
            className="absolute right-6 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-techo-secondary"
            aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2 2 0 0118 14.18V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.18a2 2 0 01-.595 1.415L4 17h5m6 0a3 3 0 11-6 0" />
            </svg>
            {noLeidas > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{noLeidas > 99 ? '99+' : noLeidas}</span>}
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Accesos rápidos */}
          <div>
            <h2 className="text-xs font-bold text-techo-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-3 h-0.5 bg-techo-secondary rounded-full inline-block" />
              Accesos rápidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accesos.map((acceso, i) => (
                <Link
                  key={acceso.path}
                  to={acceso.path}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="group animate-fadeInUp bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 no-underline"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${coloresPorPath[acceso.path] || 'from-gray-500 to-gray-700'} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
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
                    <div className="font-bold text-gray-900 text-sm">{acceso.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{acceso.desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-techo-secondary group-hover:gap-2 transition-all mt-auto">
                    Ir <span>→</span>
                  </div>
                </Link>
              ))}
              <button
                type="button"
                onClick={salir}
                style={{ animationDelay: `${accesos.length * 60}ms` }}
                className="group animate-fadeInUp flex flex-col gap-3 rounded-2xl border border-red-100 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-md transition-transform group-hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                  </svg>
                </div>
                <div><div className="text-sm font-bold text-gray-900">Cerrar sesión</div><div className="mt-0.5 text-xs text-gray-400">Salir de la plataforma de forma segura</div></div>
                <div className="mt-auto text-xs font-semibold text-red-600">Salir</div>
              </button>
            </div>
          </div>

        </div>
      </div>

      {notificacionesAbiertas && (
        <div className="fixed inset-0 z-[5000] flex items-start justify-end bg-transparent p-4 pt-24 sm:pr-6" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setNotificacionesAbiertas(false); }}>
          <section className="flex max-h-[70vh] w-full max-w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Notificaciones">
            <header className="flex items-center justify-between border-b px-5 py-4">
              <div><h2 className="font-bold text-techo-primary">Notificaciones</h2><p className="text-xs text-gray-400">{noLeidas} sin leer</p></div>
              <div className="flex items-center gap-3">
                {noLeidas > 0 && <button type="button" onClick={leerTodas} className="text-xs font-semibold text-techo-secondary">Marcar todas</button>}
                <button type="button" onClick={() => setNotificacionesAbiertas(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Cerrar notificaciones">X</button>
              </div>
            </header>
            <div className="overflow-y-auto">
              {cargandoNotificaciones && notificaciones.length === 0 && <p className="p-8 text-center text-sm text-gray-400">Cargando notificaciones...</p>}
              {errorNotificaciones && <p className="m-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorNotificaciones}</p>}
              {!cargandoNotificaciones && notificaciones.length === 0 && !errorNotificaciones && <p className="p-8 text-center text-sm text-gray-400">No tienes notificaciones.</p>}
              {notificaciones.map((notificacion) => (
                <button type="button" key={notificacion.id} onClick={() => leerNotificacion(notificacion)} className={`block w-full border-b px-5 py-4 text-left ${notificacion.leida ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/70 hover:bg-blue-50'}`}>
                  <div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notificacion.leida ? 'bg-gray-300' : 'bg-techo-secondary'}`} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><strong className="text-sm text-gray-800">{notificacion.titulo}</strong><time className="shrink-0 text-[10px] text-gray-400">{formatearFecha(notificacion.creado_en)}</time></div><p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{notificacion.mensaje}</p></div></div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

