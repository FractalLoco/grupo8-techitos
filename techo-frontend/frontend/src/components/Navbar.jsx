// Importo useState para controlar si el menú lateral está abierto o cerrado
import { useCallback, useEffect, useRef, useState } from 'react';
// Importo useNavigate para redirigir después del cierre de sesión y Link para los enlaces del menú
import { useNavigate, Link } from 'react-router-dom';
// Accedo al usuario activo y a la función de cierre de sesión desde el contexto
import { useAutenticacion } from '../context/AuthContext';
import {
  contarNoLeidas,
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from '../services/notificacionService';

// Navbar fija en la parte superior con menú lateral deslizante.
// Muestra opciones de navegación distintas según el rol del usuario autenticado.
function Navbar() {
  // Controlo la visibilidad del menú lateral con este booleano
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [panelNotificacionesAbierto, setPanelNotificacionesAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false);
  const [errorNotificaciones, setErrorNotificaciones] = useState('');
  const panelNotificacionesRef = useRef(null);
  const { usuario, cerrarSesion } = useAutenticacion();
  const navegar = useNavigate();

  const cargarNotificaciones = useCallback(async () => {
    if (!usuario) return;

    try {
      setErrorNotificaciones('');
      const resultado = await listarNotificaciones();
      const lista = resultado?.notificaciones || resultado || [];
      setNotificaciones(Array.isArray(lista) ? lista : []);
    } catch (error) {
      setErrorNotificaciones(error.message || 'No se pudieron cargar las notificaciones');
    } finally {
      setCargandoNotificaciones(false);
    }
  }, [usuario]);

  // Polling de notificaciones no leídas cada 5 segundos
  useEffect(() => {
    if (!usuario) return;

    const actualizar = async () => {
      try {
        const total = await contarNoLeidas();
        setNoLeidas(total);
      } catch {
        // Silencioso
      }
    };

    actualizar();
    const intervalo = setInterval(actualizar, 5000);
    return () => clearInterval(intervalo);
  }, [usuario]);

  useEffect(() => {
    if (!panelNotificacionesAbierto) return;

    setCargandoNotificaciones(true);
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 5000);

    const cerrarAlPulsarFuera = (evento) => {
      if (!panelNotificacionesRef.current?.contains(evento.target)) {
        setPanelNotificacionesAbierto(false);
      }
    };
    const cerrarConEscape = (evento) => {
      if (evento.key === 'Escape') setPanelNotificacionesAbierto(false);
    };

    document.addEventListener('mousedown', cerrarAlPulsarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('mousedown', cerrarAlPulsarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [panelNotificacionesAbierto, cargarNotificaciones]);

  const manejarNotificacion = async (notificacion) => {
    if (notificacion.leida) return;

    try {
      await marcarLeida(notificacion.id);
      setNotificaciones((actuales) =>
        actuales.map((item) => (
          item.id === notificacion.id ? { ...item, leida: true } : item
        ))
      );
      setNoLeidas((total) => Math.max(0, total - 1));
    } catch (error) {
      setErrorNotificaciones(error.message || 'No se pudo marcar la notificacion');
    }
  };

  const manejarMarcarTodas = async () => {
    try {
      await marcarTodasLeidas();
      setNotificaciones((actuales) => actuales.map((item) => ({ ...item, leida: true })));
      setNoLeidas(0);
    } catch (error) {
      setErrorNotificaciones(error.message || 'No se pudieron marcar las notificaciones');
    }
  };

  const formatearFechaNotificacion = (fecha) => {
    if (!fecha) return '';
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(fecha));
  };

  const alternarMenu = () => setMenuAbierto(!menuAbierto);
  // Cierro el menú al hacer clic en un enlace o en el overlay oscuro
  const cerrarMenu = () => setMenuAbierto(false);

  // Limpio la sesión y redirijo al login cuando el usuario pulsa "Cerrar sesión"
  const manejarCierreSesion = () => {
    cerrarSesion();
    navegar('/auth/iniciar-sesion');
  };

  // Mapeo los valores de rol técnico a etiquetas legibles para mostrar en la UI
  const etiquetaRol = {
    coordinador: 'Coordinador',
    jefe_cuadrilla: 'Jefe de Cuadrilla',
    voluntario: 'Voluntario',
  };

  // Defino los enlaces de navegación con sus rutas e íconos SVG en formato path
  const enlaces = [
    { label: 'Inicio', path: '/inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Comunicaciones', path: '/comunicaciones', icon: 'M8 10h8m-8 4h5m-6 6h12a2 2 0 002-2v-6a2 2 0 00-2-2h-1l-3-3H7a2 2 0 00-2 2v9a2 2 0 002 2z' },
    { label: 'Cuadrillas', path: '/cuadrillas', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Mapa', path: '/mapa', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    { label: 'Emergencias', path: '/emergencias', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Usuarios', path: '/usuarios', icon: 'M18 9a3 3 0 11-6 0 3 3 0 016 0zm-9 11a4 4 0 118 0H9zm-2-8a2 2 0 100-4 2 2 0 000 4z' },
    { label: 'Herramientas', path: '/herramientas', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { label: 'Inventario', path: '/catalogo', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6' },
    { label: 'Solicitudes', path: '/solicitudes', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 6h6m-6 4h4' },
    { label: 'Reportes', path: '/reportes', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';
  // Los voluntarios solo ven Inicio, Mapa y Comunicaciones; el jefe además ve Cuadrillas y Solicitudes
  const enlacesJefe = ['Inicio', 'Comunicaciones', 'Cuadrillas', 'Mapa', 'Herramientas', 'Inventario', 'Solicitudes'];
  const enlacesVoluntario = ['Inicio', 'Comunicaciones', 'Mapa'];

  return (
    <>
      {/* Barra superior fija — z-[1000] para quedar sobre los tiles y controles de Leaflet (que llegan a z-index 800) */}
      <nav className="fixed top-0 left-0 right-0 h-[60px] bg-primary/95 backdrop-blur-sm flex items-center justify-between px-6 z-[1000] shadow-lg">
        {/* Botón de tres líneas que abre el menú lateral */}
        <button
          className="bg-transparent border-none cursor-pointer flex flex-col gap-[5px] p-1"
          onClick={alternarMenu}
        >
          <span className="block w-6 h-[2px] bg-white rounded-sm"></span>
          <span className="block w-6 h-[2px] bg-white rounded-sm"></span>
          <span className="block w-6 h-[2px] bg-white rounded-sm"></span>
        </button>

        {/* Campana de notificaciones */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onMouseDown={(evento) => evento.stopPropagation()}
            onClick={() => setPanelNotificacionesAbierto((abierto) => !abierto)}
            className="relative text-white/80 hover:text-white transition-colors"
            aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
            aria-expanded={panelNotificacionesAbierto}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {noLeidas > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow">
                {noLeidas > 99 ? '99+' : noLeidas}
              </span>
            )}
          </button>

          {/* Muestro el nombre y rol del usuario en la esquina superior derecha */}
          <div className="flex flex-col items-end">
            <span className="text-white text-sm font-semibold">{usuario.nombre}</span>
            <span className="text-white/60 text-xs">{etiquetaRol[usuario.rol] || usuario.rol}</span>
          </div>
        </div>
      </nav>

      {/* Overlay oscuro — z-[2000] para tapar el mapa y todo su contenido cuando el menú está abierto */}
      {panelNotificacionesAbierto && (
        <section
          ref={panelNotificacionesRef}
          className="fixed top-[68px] right-2 sm:right-6 z-[3100] w-[calc(100vw-1rem)] sm:w-[380px] max-h-[70vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          aria-label="Panel de notificaciones"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-techo-primary">Notificaciones</h2>
              <p className="text-xs text-gray-400">{noLeidas} sin leer</p>
            </div>
            <div className="flex items-center gap-3">
              {noLeidas > 0 && (
                <button
                  type="button"
                  onClick={manejarMarcarTodas}
                  className="text-xs font-semibold text-techo-secondary hover:text-techo-primary"
                >
                  Marcar todas
                </button>
              )}
              <button
                type="button"
                onClick={() => setPanelNotificacionesAbierto(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Cerrar notificaciones"
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>
          </div>

          <div className="max-h-[calc(70vh-65px)] overflow-y-auto">
            {cargandoNotificaciones && notificaciones.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                Cargando notificaciones...
              </p>
            )}

            {errorNotificaciones && (
              <div className="m-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorNotificaciones}
              </div>
            )}

            {!cargandoNotificaciones && notificaciones.length === 0 && !errorNotificaciones && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                No tienes notificaciones.
              </p>
            )}

            {notificaciones.map((notificacion) => (
              <button
                type="button"
                key={notificacion.id}
                onClick={() => manejarNotificacion(notificacion)}
                className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
                  notificacion.leida ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/70 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notificacion.leida ? 'bg-gray-300' : 'bg-techo-secondary'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {notificacion.titulo}
                      </p>
                      <time className="shrink-0 text-[10px] text-gray-400">
                        {formatearFechaNotificacion(notificacion.creado_en)}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-600">
                      {notificacion.mensaje}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {menuAbierto && (
        <div className="fixed inset-0 bg-black/40 z-[2000]" onClick={cerrarMenu} />
      )}

      {/* Panel lateral deslizante — z-[3000] para estar siempre encima del overlay y del mapa */}
      <div className={`fixed top-0 bottom-0 w-[300px] bg-gradient-to-b from-primary to-inverse-surface z-[3000] transition-all duration-300 flex flex-col ${menuAbierto ? 'left-0' : '-left-[300px]'}`}>
        {/* Botón X para cerrar el panel desde adentro */}
        <button className="self-end text-white text-xl cursor-pointer bg-transparent border-none p-2 mb-4 hover:bg-white/10 rounded" onClick={cerrarMenu}>
          ✕
        </button>

        {/* Cabecera del panel con el nombre y rol del usuario */}
        {usuario && (
          <div className="border-b border-white/15 pb-4 mb-4 px-4">
            <p className="text-white font-bold text-base">{usuario.nombre}</p>
            <p className="text-white/55 text-sm">{etiquetaRol[usuario.rol] || usuario.rol}</p>
          </div>
        )}

        <div className="flex-1 px-4">
          <nav className="space-y-1">
            {/* El coordinador ve todas las secciones bajo la categoría "Administración" */}
            {esCoordinador && (
              <div className="mb-3">
                {enlaces.map((enlace) => (
                  <Link
                    key={enlace.path}
                    to={enlace.path}
                    onClick={cerrarMenu}
                    className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={enlace.icon} />
                    </svg>
                    {enlace.label}
                  </Link>
                ))}
              </div>
            )}

            {/* El jefe ve Inicio, Comunicaciones, Cuadrillas y Mapa */}
            {esJefe && (
              <div className="mb-3">
                {enlaces.filter((e) => enlacesJefe.includes(e.label)).map((enlace) => (
                  <Link key={enlace.path} to={enlace.path} onClick={cerrarMenu}
                    className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={enlace.icon} />
                    </svg>
                    {enlace.label}
                  </Link>
                ))}
              </div>
            )}

            {/* El voluntario solo ve Inicio, Comunicaciones y Mapa */}
            {!esCoordinador && !esJefe && (
              <div className="mb-3">
                {enlaces.filter((e) => enlacesVoluntario.includes(e.label)).map((enlace) => (
                  <Link key={enlace.path} to={enlace.path} onClick={cerrarMenu}
                    className="flex items-center gap-3 px-3 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={enlace.icon} />
                    </svg>
                    {enlace.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Solo el coordinador puede registrar nuevos usuarios desde el menú */}
            {esCoordinador && (
              <Link
                to="/auth/registro"
                onClick={cerrarMenu}
                className="flex items-center gap-3 px-3 py-2.5 text-primary hover:bg-white/10 rounded-lg transition-all text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Registrar Usuario
              </Link>
            )}
          </nav>
        </div>

        {/* Pie del panel: botón de cierre de sesión y logo de TECHO */}
        <div className="px-4 pb-4 space-y-3">
          <button
            className="w-full py-2.5 bg-white/10 border border-white/25 rounded-lg text-white text-sm font-semibold hover:bg-white/20 transition-all"
            onClick={manejarCierreSesion}
          >
            Cerrar sesión
          </button>
          <div className="border-t border-white/15 pt-4">
            {/* Si el logo SVG no existe, simplemente lo oculto sin romper el layout */}
            <img
              src="/logo.svg"
              alt="TECHO Chile"
              className="w-28 mx-auto brightness-0 invert"
              onError={(e) => (e.target.style.display = 'none')}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
