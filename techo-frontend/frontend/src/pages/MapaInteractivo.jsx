import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MdMap,
  MdFilterList,
  MdRefresh,
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdMyLocation,
  MdWarning,
  MdCheckCircle,
  MdError,
  MdHome,
  MdOutlineConstruction,
  MdLocationOn,
  MdSchedule,
  MdArrowBack,
} from 'react-icons/md';
import { FaExclamationTriangle, FaMapMarkerAlt, FaRoute } from 'react-icons/fa';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerEmergencias, obtenerFamilias } from '../services/emergenciaService';
import { listarObrasPorEmergencia, listarTodasLasObras } from '../services/obraService';
import { listarCuadrillasConEstado, listarTodasLasCuadrillasConEstado } from '../services/cuadrillaService';
import { listarZonasPorEmergencia, listarTodasLasZonas, crearZona, actualizarZona, eliminarZona } from '../services/zonaPeligroService';

// Leaflet: corregir íconos en Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const crearIcono = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });

const iconoFamilia = L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">F</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

const iconoEmergencia = L.divIcon({
  className: '',
  html: `<div style="width:30px;height:30px;background:#dc2626;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;">E</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

const ICONOS_OBRA = {
  verde: crearIcono('#22c55e'),
  amarillo: crearIcono('#eab308'),
  rojo: crearIcono('#ef4444'),
  azul: crearIcono('#3b82f6'),
  gris: crearIcono('#9ca3af'),
};

const COLORES_ESTADO = {
  verde:    { label: 'En plazo',            hex: '#22c55e' },
  amarillo: { label: 'Riesgo de retraso',   hex: '#eab308' },
  rojo:     { label: 'Requiere intervención', hex: '#ef4444' },
  azul:     { label: 'Sin obra asignada',   hex: '#3b82f6' },
  gris:     { label: 'Completada',          hex: '#9ca3af' },
};

const CENTRO_DEFAULT = [-36.827, -73.049];
const INTERVALO_REFRESCO = 60; // segundos

function CapturadorClic({ activo, onClic }) {
  useMapEvents({
    click(e) { if (activo) onClic(e.latlng); },
  });
  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────
function MapaInteractivo() {
  const { usuario } = useAutenticacion();
  const navigate = useNavigate();
  const esCoordinador = usuario?.rol === 'coordinador';

  // Estado general
  const [emergencias, setEmergencias]       = useState([]);
  const [emergenciaId, setEmergenciaId]     = useState('');
  const [filtroEstado, setFiltroEstado]     = useState(''); // activa | cerrada | ''
  const [obras, setObras]                   = useState([]);
  const [cuadrillas, setCuadrillas]         = useState([]);
  const [familias, setFamilias]             = useState([]);
  const [zonas, setZonas]                   = useState([]);
  const [cargando, setCargando]             = useState(false);
  const [mensaje, setMensaje]               = useState(null);

  // Filtros de capas
  const [mostrarObras, setMostrarObras]         = useState(true);
  const [mostrarFamilias, setMostrarFamilias]   = useState(true);
  const [mostrarZonas, setMostrarZonas]         = useState(true);
  const [filtroColor, setFiltroColor]           = useState('');

  // Auto-refresh
  const [segundosRestantes, setSegundosRestantes] = useState(INTERVALO_REFRESCO);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // Zona de peligro
  const [modoCrearZona, setModoCrearZona]       = useState(false);
  const [formularioZona, setFormularioZona]     = useState({ tipo: 'amarilla', radio: 200, descripcion: '', comentarios: '', emergencia_id_form: '' });
  const [zonaPendiente, setZonaPendiente]       = useState(null);
  const [zonaEditando, setZonaEditando]         = useState(null);
  const [mostrarFormZona, setMostrarFormZona]   = useState(false);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  // ── Carga de emergencias ─────────────────────────────────────────────────
  useEffect(() => {
    obtenerEmergencias()
      .then((data) => {
        const lista = data?.datos?.emergencias || data?.datos || [];
        setEmergencias(Array.isArray(lista) ? lista : []);
      })
      .catch(() => mostrarMensaje('error', 'Error al cargar emergencias'));
  }, []);

  // ── Carga de datos del mapa ──────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      let listaObras = [], listaCuad = [], listaFam = [], listaZonas = [];

      if (emergenciaId) {
        const [dataObras, dataCuad, dataFam, dataZonas] = await Promise.all([
          listarObrasPorEmergencia(emergenciaId),
          listarCuadrillasConEstado(emergenciaId),
          obtenerFamilias(emergenciaId),
          listarZonasPorEmergencia(emergenciaId),
        ]);
        listaObras  = dataObras?.datos?.obras       || dataObras?.datos  || [];
        listaCuad   = dataCuad?.datos?.cuadrillas   || [];
        listaFam    = dataFam?.datos?.familias       || dataFam?.familias || [];
        listaZonas  = dataZonas?.datos?.zonas        || [];
      } else {
        const [dataObras, dataCuad, dataZonas] = await Promise.all([
          listarTodasLasObras(),
          listarTodasLasCuadrillasConEstado(),
          listarTodasLasZonas(),
        ]);
        listaObras  = dataObras?.datos?.obras     || dataObras?.datos || [];
        listaCuad   = dataCuad?.datos?.cuadrillas || [];
        listaZonas  = dataZonas?.datos?.zonas     || [];
      }

      const obrasMapeadas = Array.isArray(listaObras)
        ? listaObras.map((o) => {
            const cuadrilla = listaCuad.find((c) => c.obra_asignada_id === o.id);
            return { ...o, estadoColor: cuadrilla?.estadoColor || 'azul', cuadrilla };
          })
        : [];

      setObras(obrasMapeadas);
      setCuadrillas(Array.isArray(listaCuad) ? listaCuad : []);
      setFamilias(Array.isArray(listaFam) ? listaFam : []);
      setZonas(Array.isArray(listaZonas) ? listaZonas : []);
      setUltimaActualizacion(new Date());
      setSegundosRestantes(INTERVALO_REFRESCO);
    } catch {
      mostrarMensaje('error', 'Error al cargar datos del mapa');
    } finally {
      setCargando(false);
    }
  }, [emergenciaId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Auto-refresh cada 60 s ───────────────────────────────────────────────
  useEffect(() => {
    const intervalo = setInterval(() => cargarDatos(), INTERVALO_REFRESCO * 1000);
    return () => clearInterval(intervalo);
  }, [cargarDatos]);

  // Contador regresivo de 1 en 1 segundo
  useEffect(() => {
    const tick = setInterval(() => {
      setSegundosRestantes((s) => (s <= 1 ? INTERVALO_REFRESCO : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const obrasFiltradas = filtroColor ? obras.filter((o) => o.estadoColor === filtroColor) : obras;

  const emergenciasFiltradas = filtroEstado
    ? emergencias.filter((e) => e.estado === filtroEstado)
    : emergencias;

  // ── Zona de peligro ──────────────────────────────────────────────────────
  const handleClicMapa = (latlng) => { setZonaPendiente(latlng); setMostrarFormZona(true); setModoCrearZona(false); };

  const handleGuardarZona = async (e) => {
    e.preventDefault();
    try {
      if (zonaEditando) {
        await actualizarZona(zonaEditando.id, formularioZona);
        mostrarMensaje('exito', 'Zona actualizada');
      } else {
        const emId = emergenciaId || formularioZona.emergencia_id_form;
        if (!emId) { mostrarMensaje('error', 'Selecciona una emergencia para la zona'); return; }
        await crearZona({
          emergencia_id: emId,
          tipo: formularioZona.tipo,
          lat: zonaPendiente.lat,
          lng: zonaPendiente.lng,
          radio: Number(formularioZona.radio),
          descripcion: formularioZona.descripcion,
          comentarios: formularioZona.comentarios,
        });
        mostrarMensaje('exito', 'Zona de peligro creada');
      }
      setMostrarFormZona(false); setZonaPendiente(null); setZonaEditando(null);
      setFormularioZona({ tipo: 'amarilla', radio: 200, descripcion: '', comentarios: '', emergencia_id_form: '' });
      cargarDatos();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleEditarZona  = (zona) => { setZonaEditando(zona); setFormularioZona({ tipo: zona.tipo, radio: zona.radio, descripcion: zona.descripcion || '', comentarios: zona.comentarios || '' }); setMostrarFormZona(true); };
  const handleEliminarZona = async (id) => { if (!window.confirm('¿Eliminar esta zona de peligro?')) return; try { await eliminarZona(id); mostrarMensaje('exito', 'Zona eliminada'); cargarDatos(); } catch (err) { mostrarMensaje('error', err.message); } };

  const abrirGoogleMaps = (lat, lng) => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  const abrirWaze       = (lat, lng) => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');

  // Centro del mapa
  const emergenciaActual = emergencias.find((e) => String(e.id) === String(emergenciaId));
  const centroMapa = (() => {
    if (emergenciaActual?.lat != null && emergenciaActual?.lng != null) return [Number(emergenciaActual.lat), Number(emergenciaActual.lng)];
    if (obras.length > 0 && obras[0].lat != null) return [Number(obras[0].lat), Number(obras[0].lng)];
    return CENTRO_DEFAULT;
  })();

  // Resumen de cuadrillas por emergencia (para el sidebar)
  const resumenEmergencia = (emId) => {
    const obrasEm = obras.filter((o) => o.emergencia_id === emId);
    const rojas   = obrasEm.filter((o) => o.estadoColor === 'rojo').length;
    const amarillas = obrasEm.filter((o) => o.estadoColor === 'amarillo').length;
    return { total: obrasEm.length, rojas, amarillas };
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Toast */}
      {mensaje && (
        <div className={`fixed top-[86px] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold ${mensaje.tipo === 'exito' ? 'bg-secondary' : 'bg-error'} text-white`}>
          {mensaje.tipo === 'exito' ? <MdCheckCircle /> : <MdError />}
          {mensaje.texto}
        </div>
      )}

      {/* Banner: modo colocar zona */}
      {modoCrearZona && (
        <div className="fixed top-[86px] left-1/2 -translate-x-1/2 z-[9998] bg-tertiary/50 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl flex items-center gap-2">
          <MdMyLocation className="animate-pulse" />
          Haz clic en el mapa para colocar la zona de peligro
          <button onClick={() => setModoCrearZona(false)} className="ml-1 hover:bg-white/20 rounded-full p-0.5"><MdClose /></button>
        </div>
      )}

      {/* ── Layout principal: sidebar + mapa ─────────────────────────────── */}
      <div className="flex" style={{ height: '100vh' }}>

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════ */}
        <aside className="w-64 bg-inverse-surface flex flex-col flex-shrink-0 overflow-hidden border-r border-white/10 shadow-lg">

          {/* Cabecera del sidebar */}
          <div className="px-4 py-3 bg-primary border-b border-white/10">
            <button
              type="button"
              onClick={() => navigate('/inicio')}
              className="mb-3 flex min-h-11 w-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-label="Volver al inicio"
            >
              <MdArrowBack className="text-xl" />
              Volver al inicio
            </button>
            <div className="flex items-center gap-2 mb-2">
              <MdMap className="text-white/90 text-lg" />
              <h2 className="text-white font-bold text-sm tracking-wide">Mapa Interactivo</h2>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white/90">
                <MdOutlineConstruction className="text-xs" /> {obras.length} obras
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white/90">
                <FaMapMarkerAlt className="text-[9px]" /> {zonas.length} zonas
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white/90">
                <MdHome className="text-xs" /> {familias.length} familias
              </span>
            </div>
          </div>

          {/* Filtro de estado de emergencias */}
          <div className="px-3 pt-3 pb-2">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2 px-1">Filtrar por estado</p>
            <div className="flex gap-1.5">
              {[
                { val: '',        label: 'Todas'   },
                { val: 'activa',  label: 'Activas' },
                { val: 'cerrada', label: 'Cerradas' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setFiltroEstado(val)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    filtroEstado === val
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Opción "Todas las emergencias" */}
          <div className="px-3 pb-2">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2 px-1 mt-1">Vista</p>
            <button
              onClick={() => setEmergenciaId('')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                !emergenciaId
                  ? 'bg-primary text-white shadow-md'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${!emergenciaId ? 'bg-white/20' : 'bg-white/10'}`}>
                <MdMap className="text-sm text-white" />
              </div>
              <div className="text-left min-w-0">
                <p className="leading-tight truncate">Todas</p>
                <p className="text-[11px] leading-tight mt-0.5 text-white/50">
                  {obras.length} obras · {cuadrillas.length} cuadrillas
                </p>
              </div>
            </button>
          </div>

          <div className="mx-3 border-t border-white/10" />

          {/* Lista de emergencias */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2 px-1">
              Emergencias ({emergenciasFiltradas.length})
            </p>

            {emergenciasFiltradas.length === 0 && (
              <p className="text-white/40 text-xs text-center py-8">Sin emergencias</p>
            )}

            {emergenciasFiltradas.map((em) => {
              const activa  = String(emergenciaId) === String(em.id);
              const resumen = resumenEmergencia(em.id);
              return (
                <button
                  key={em.id}
                  onClick={() => setEmergenciaId(activa ? '' : String(em.id))}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    activa
                      ? 'bg-primary text-white shadow-md'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {/* Icono con indicador de estado */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      activa ? 'bg-white/20 text-white' : 'bg-white/15 text-white/80'
                    }`}>
                      {em.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${activa ? 'border-primary' : 'border-inverse-surface'} ${
                      em.estado === 'activa' ? 'bg-secondary-fixed-dim' : 'bg-outline'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-tight">{em.nombre}</p>
                    <p className="text-[11px] leading-tight mt-0.5 truncate text-white/50">
                      {em.estado === 'activa' ? 'Activa' : 'Cerrada'}
                      {em.direccion ? ` · ${em.direccion}` : ''}
                    </p>
                    {/* Alertas de cuadrillas (solo en vista global) */}
                    {!emergenciaId && resumen.total > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/15 text-white/70">
                          {resumen.total} obras
                        </span>
                        {resumen.rojas > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-error/30 text-error-container">
                            {resumen.rojas} roja{resumen.rojas > 1 ? 's' : ''}
                          </span>
                        )}
                        {resumen.amarillas > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-tertiary/50/20 text-tertiary-fixed-dim">
                            {resumen.amarillas} alerta{resumen.amarillas > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Auto-refresh indicator */}
          <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2 bg-[#1e2429]">
            {cargando ? (
              <>
                <div className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse flex-shrink-0" />
                <span className="text-white/40 text-xs">Actualizando mapa...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-secondary-fixed-dim flex-shrink-0" />
                <span className="text-white/50 text-xs flex-1">
                  {ultimaActualizacion
                    ? `Act. ${ultimaActualizacion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : 'Conectado'}
                </span>
                <span className="text-white/30 text-[10px] flex-shrink-0 flex items-center gap-1">
                  <MdSchedule className="text-xs" />
                  {segundosRestantes}s
                </span>
              </>
            )}
          </div>
        </aside>

        {/* ══ ÁREA PRINCIPAL: barra + mapa + leyenda ═══════════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Barra de controles */}
          <div className="bg-white border-b border-outline-variant px-4 py-2.5 flex flex-wrap items-center gap-2 z-10 shadow-sm">

            {/* Título de la vista actual */}
            <div className="flex items-center gap-2 pr-3 border-r border-outline-variant">
              <MdLocationOn className="text-primary text-base" />
              <span className="text-on-surface text-sm font-semibold">
                {emergenciaActual ? emergenciaActual.nombre : 'Vista global'}
              </span>
              {emergenciaActual && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  emergenciaActual.estado === 'activa'
                    ? 'bg-secondary/10 text-secondary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {emergenciaActual.estado}
                </span>
              )}
            </div>

            {/* Filtro por color de estado */}
            <div className="flex items-center gap-1 flex-wrap">
              <MdFilterList className="text-outline text-sm" />
              {Object.entries(COLORES_ESTADO).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFiltroColor(filtroColor === k ? '' : k)}
                  style={filtroColor === k ? { borderColor: v.hex, backgroundColor: v.hex + '18', color: v.hex } : {}}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                    filtroColor === k ? '' : 'border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'
                  }`}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: v.hex }} />
                  {v.label}
                </button>
              ))}
            </div>

            {/* Toggles de capas */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ToggleLayer activo={mostrarObras}   onClick={() => setMostrarObras(!mostrarObras)}     label="Obras"    icono={<MdOutlineConstruction />} />
              <ToggleLayer activo={mostrarZonas}   onClick={() => setMostrarZonas(!mostrarZonas)}     label="Zonas"    icono={<MdWarning />} />
              {emergenciaId && (
                <ToggleLayer activo={mostrarFamilias} onClick={() => setMostrarFamilias(!mostrarFamilias)} label="Familias" icono={<MdHome />} />
              )}
              {esCoordinador && (
                <button
                  onClick={() => setModoCrearZona(!modoCrearZona)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    modoCrearZona
                      ? 'bg-tertiary/50 text-white border-tertiary'
                      : 'bg-tertiary/5 text-tertiary border-tertiary/30 hover:bg-tertiary/10'
                  }`}
                >
                  <MdAdd /> Zona peligro
                </button>
              )}
              <button
                onClick={cargarDatos}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-highest rounded-lg text-xs text-on-surface-variant hover:text-on-surface transition border border-outline-variant"
                title="Recargar ahora"
              >
                <MdRefresh className={cargando ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Mapa Leaflet */}
          <div className="flex-1 relative">
            {cargando && obras.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-surface-container-low">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-outline text-sm">Cargando datos del mapa...</span>
              </div>
            ) : (
              <MapContainer
                key={emergenciaId || 'global'}
                center={centroMapa}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CapturadorClic activo={modoCrearZona} onClic={handleClicMapa} />

                {/* En vista global: marcadores de todas las emergencias con lat/lng */}
                {!emergenciaId && emergencias.map((em) =>
                  em.lat != null && em.lng != null ? (
                    <Marker
                      key={`em-${em.id}`}
                      position={[Number(em.lat), Number(em.lng)]}
                      icon={iconoEmergencia}
                    >
                      <Popup maxWidth={260}>
                        <div style={{ minWidth: 200 }}>
                          <strong className="text-on-surface text-sm block mb-1">{em.nombre}</strong>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${em.estado === 'activa' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'}`}>
                            {em.estado}
                          </span>
                          {em.direccion && <p className="text-xs text-on-surface-variant mt-1">{em.direccion}</p>}
                          <p className="text-xs text-outline font-mono mt-1">{Number(em.lat).toFixed(5)}, {Number(em.lng).toFixed(5)}</p>
                          <button
                            onClick={() => setEmergenciaId(String(em.id))}
                            className="mt-2 w-full py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition"
                          >
                            Ver esta emergencia
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                )}

                {/* Marcador de la emergencia seleccionada */}
                {emergenciaActual?.lat != null && emergenciaActual?.lng != null && (
                  <Marker
                    position={[Number(emergenciaActual.lat), Number(emergenciaActual.lng)]}
                    icon={iconoEmergencia}
                  >
                    <Popup maxWidth={280}>
                      <div style={{ minWidth: 210 }}>
                        <strong className="text-on-surface text-sm block mb-1">{emergenciaActual.nombre}</strong>
                        {emergenciaActual.direccion && (
                          <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1">
                            <FaMapMarkerAlt className="text-outline flex-shrink-0" />
                            {emergenciaActual.direccion}
                          </p>
                        )}
                        {emergenciaActual.descripcion && <p className="text-xs text-on-surface-variant mb-1">{emergenciaActual.descripcion}</p>}
                        <p className="text-xs text-outline font-mono mb-2">
                          {Number(emergenciaActual.lat).toFixed(5)}, {Number(emergenciaActual.lng).toFixed(5)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <BtnMapa icono={<FaRoute />} label="Google Maps" onClick={() => abrirGoogleMaps(emergenciaActual.lat, emergenciaActual.lng)} color="#4285f4" />
                          <BtnMapa icono={<FaMapMarkerAlt />} label="Waze" onClick={() => abrirWaze(emergenciaActual.lat, emergenciaActual.lng)} color="#33ccff" />
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Marcadores de obras */}
                {mostrarObras && obrasFiltradas.map((obra) =>
                  obra.lat && obra.lng ? (
                    <Marker key={`obra-${obra.id}`} position={[obra.lat, obra.lng]} icon={ICONOS_OBRA[obra.estadoColor] || ICONOS_OBRA.azul}>
                      <Popup maxWidth={300}>
                        <PopupObra obra={obra} onGoogleMaps={abrirGoogleMaps} onWaze={abrirWaze} onVerEmergencia={(id) => setEmergenciaId(String(id))} modoGlobal={!emergenciaId} />
                      </Popup>
                    </Marker>
                  ) : null
                )}

                {/* Marcadores de familias */}
                {mostrarFamilias && familias.map((fam) =>
                  fam.lat && fam.lng ? (
                    <Marker key={`fam-${fam.id}`} position={[fam.lat, fam.lng]} icon={iconoFamilia}>
                      <Popup maxWidth={280}><PopupFamilia fam={fam} onGoogleMaps={abrirGoogleMaps} onWaze={abrirWaze} /></Popup>
                    </Marker>
                  ) : null
                )}

                {/* Círculos de zonas de peligro */}
                {mostrarZonas && zonas.map((zona) => (
                  <Circle
                    key={`zona-${zona.id}`}
                    center={[zona.lat, zona.lng]}
                    radius={zona.radio}
                    pathOptions={{ color: zona.tipo === 'roja' ? '#ef4444' : '#eab308', fillColor: zona.tipo === 'roja' ? '#ef4444' : '#eab308', fillOpacity: 0.2, weight: 2 }}
                  >
                    <Popup maxWidth={280}>
                      <PopupZona zona={zona} esCoordinador={esCoordinador} onEditar={handleEditarZona} onEliminar={handleEliminarZona} />
                    </Popup>
                  </Circle>
                ))}
              </MapContainer>
            )}
          </div>

          {/* Leyenda */}
          <div className="bg-white border-t border-outline-variant px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-outline font-bold uppercase tracking-wide text-[10px] pr-3 border-r border-outline-variant">Leyenda</span>
            <div className={`flex items-center gap-3 flex-wrap ${emergenciaId ? 'pr-3 border-r border-outline-variant' : ''}`}>
              {Object.entries(COLORES_ESTADO).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: v.hex }} />
                  {v.label}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-2 text-on-surface-variant"><span className="inline-block w-8 h-1.5 rounded-full" style={{ background: '#eab308', opacity: 0.7 }} />Zona amarilla</span>
            <span className="flex items-center gap-2 text-on-surface-variant"><span className="inline-block w-8 h-1.5 rounded-full" style={{ background: '#ef4444', opacity: 0.7 }} />Zona roja</span>
            {emergenciaId && (
              <>
                <span className="flex items-center gap-1.5 text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-full bg-error" />Emergencia</span>
                <span className="flex items-center gap-1.5 text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-full bg-primary/50" />Familia</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: crear / editar zona de peligro ────────────────────────── */}
      {mostrarFormZona && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h2 className="font-bold text-on-surface">{zonaEditando ? 'Editar zona de peligro' : 'Nueva zona de peligro'}</h2>
              <button onClick={() => { setMostrarFormZona(false); setZonaEditando(null); setZonaPendiente(null); }} className="text-outline hover:text-on-surface-variant"><MdClose className="text-xl" /></button>
            </div>
            <form onSubmit={handleGuardarZona} className="p-5 flex flex-col gap-4">

              {/* Selector de emergencia — solo visible en vista global y al crear */}
              {!zonaEditando && !emergenciaId && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Emergencia <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={formularioZona.emergencia_id_form}
                    onChange={(e) => setFormularioZona({ ...formularioZona, emergencia_id_form: e.target.value })}
                  >
                    <option value="">— Selecciona la emergencia —</option>
                    {emergencias.filter((em) => em.estado === 'activa').map((em) => (
                      <option key={em.id} value={em.id}>{em.nombre}</option>
                    ))}
                  </select>
                  <p className="text-xs text-outline mt-1">La zona se asociará a esta emergencia.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Tipo de zona</label>
                <div className="flex gap-3">
                  {['amarilla', 'roja'].map((t) => (
                    <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-semibold transition ${formularioZona.tipo === t ? (t === 'roja' ? 'border-error bg-error-container/40 text-on-error-container' : 'border-tertiary bg-tertiary/5 text-tertiary') : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                      <input type="radio" className="sr-only" value={t} checked={formularioZona.tipo === t} onChange={() => setFormularioZona({ ...formularioZona, tipo: t })} />
                      <FaExclamationTriangle className={t === 'roja' ? 'text-error' : 'text-tertiary-container'} />
                      {t === 'amarilla' ? 'Amarilla (precaución)' : 'Roja (bloqueada)'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Radio (metros)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={50} max={5000} step={50} value={formularioZona.radio} onChange={(e) => setFormularioZona({ ...formularioZona, radio: Number(e.target.value) })} className="flex-1" />
                  <span className="text-sm font-bold text-primary w-16 text-right">{formularioZona.radio} m</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Descripción</label>
                <input className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Ej: Zona inundada con lodo" value={formularioZona.descripcion} onChange={(e) => setFormularioZona({ ...formularioZona, descripcion: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Comentarios adicionales</label>
                <textarea rows={2} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Notas sobre el estado actual..." value={formularioZona.comentarios} onChange={(e) => setFormularioZona({ ...formularioZona, comentarios: e.target.value })} />
              </div>
              {!zonaEditando && zonaPendiente && (
                <p className="text-xs text-outline">Ubicación: {zonaPendiente.lat.toFixed(5)}, {zonaPendiente.lng.toFixed(5)}</p>
              )}
              <button type="submit" className={`w-full py-2.5 font-semibold text-white rounded-lg transition ${formularioZona.tipo === 'roja' ? 'bg-error hover:bg-error/90' : 'bg-tertiary/50 hover:bg-tertiary/90'}`}>
                {zonaEditando ? 'Guardar cambios' : 'Crear zona de peligro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Popups ────────────────────────────────────────────────────────────────────

function PopupObra({ obra, onGoogleMaps, onWaze, onVerEmergencia, modoGlobal }) {
  const ci = { verde: '#22c55e', amarillo: '#eab308', rojo: '#ef4444', azul: '#3b82f6', gris: '#9ca3af' };
  const estadoLabels = { verde: 'En plazo', amarillo: 'Riesgo de retraso', rojo: 'Requiere intervención', azul: 'Sin cuadrilla', gris: 'Completada' };
  return (
    <div style={{ minWidth: 220 }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ci[obra.estadoColor] || '#9ca3af' }} />
        <strong className="text-on-surface text-sm">{obra.nombre}</strong>
      </div>
      {obra.descripcion && <p className="text-xs text-on-surface-variant mb-1">{obra.descripcion}</p>}
      {obra.direccion && <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1"><FaMapMarkerAlt className="text-outline flex-shrink-0" />{obra.direccion}</p>}
      <p className="text-xs text-outline font-mono mb-2">{obra.lat?.toFixed(5)}, {obra.lng?.toFixed(5)}</p>
      <div className="flex items-center gap-1 text-xs mb-1">
        <span className="font-semibold text-on-surface-variant">Estado:</span>
        <span style={{ color: ci[obra.estadoColor] }} className="font-semibold">{estadoLabels[obra.estadoColor] || obra.estadoColor}</span>
      </div>
      {obra.cuadrilla && (
        <p className="text-xs text-on-surface-variant mb-1">
          Cuadrilla: <strong>{obra.cuadrilla.nombre}</strong> · Fase: {obra.cuadrilla.fase || '—'}
        </p>
      )}
      {obra.cuadrilla?.plazo_dias && (
        <p className="text-xs text-on-surface-variant mb-2">Plazo: <strong>{obra.cuadrilla.plazo_dias} días</strong></p>
      )}
      {modoGlobal && obra.emergencia_id && onVerEmergencia && (
        <button onClick={() => onVerEmergencia(obra.emergencia_id)} className="mb-2 w-full py-1 bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs font-semibold rounded-lg transition">
          Ver emergencia
        </button>
      )}
      <div className="flex gap-2 mt-1">
        <BtnMapa icono={<FaRoute />} label="Google Maps" onClick={() => onGoogleMaps(obra.lat, obra.lng)} color="#4285f4" />
        <BtnMapa icono={<FaMapMarkerAlt />} label="Waze" onClick={() => onWaze(obra.lat, obra.lng)} color="#33ccff" />
      </div>
    </div>
  );
}

function PopupFamilia({ fam, onGoogleMaps, onWaze }) {
  const prioridadColor = { alta: '#ef4444', normal: '#3b82f6', baja: '#9ca3af' };
  return (
    <div style={{ minWidth: 210 }}>
      <strong className="text-on-surface text-sm block mb-1">{fam.nombre_cabeza_familia}</strong>
      {fam.direccion && <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1"><FaMapMarkerAlt className="text-outline flex-shrink-0" />{fam.direccion}</p>}
      <p className="text-xs text-outline font-mono mb-1">{fam.lat?.toFixed(5)}, {fam.lng?.toFixed(5)}</p>
      <div className="flex gap-3 text-xs text-on-surface-variant mb-1">
        <span>Miembros: <strong>{fam.miembros}</strong></span>
        <span>Prioridad: <strong style={{ color: prioridadColor[fam.prioridad] || '#333' }}>{fam.prioridad}</strong></span>
      </div>
      <div className="flex gap-2 mt-2">
        <BtnMapa icono={<FaRoute />} label="Google Maps" onClick={() => onGoogleMaps(fam.lat, fam.lng)} color="#4285f4" />
        <BtnMapa icono={<FaMapMarkerAlt />} label="Waze" onClick={() => onWaze(fam.lat, fam.lng)} color="#33ccff" />
      </div>
    </div>
  );
}

function PopupZona({ zona, esCoordinador, onEditar, onEliminar }) {
  const esRoja = zona.tipo === 'roja';
  return (
    <div style={{ minWidth: 210 }}>
      <div className="flex items-center gap-2 mb-1">
        <FaExclamationTriangle style={{ color: esRoja ? '#ef4444' : '#eab308' }} />
        <strong style={{ color: esRoja ? '#ef4444' : '#b45309' }}>Zona {esRoja ? 'Roja — Bloqueada' : 'Amarilla — Precaución'}</strong>
      </div>
      <p className="text-xs text-on-surface-variant mb-0.5">Radio: <strong>{zona.radio} m</strong></p>
      <p className="text-xs text-outline font-mono mb-1">{zona.lat?.toFixed(5)}, {zona.lng?.toFixed(5)}</p>
      {zona.descripcion && <p className="text-xs text-on-surface-variant mb-1">{zona.descripcion}</p>}
      {zona.comentarios && <p className="text-xs text-on-surface-variant italic mb-2 border-t border-outline-variant/60 pt-1">{zona.comentarios}</p>}
      {esCoordinador && (
        <div className="flex gap-2 mt-1">
          <button onClick={() => onEditar(zona)} className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs font-semibold"><MdEdit /> Editar</button>
          <button onClick={() => onEliminar(zona.id)} className="flex items-center gap-1 px-2 py-1 rounded bg-error-container hover:bg-error-container text-on-error-container text-xs font-semibold"><MdDelete /> Eliminar</button>
        </div>
      )}
    </div>
  );
}

function BtnMapa({ icono, label, onClick, color }) {
  return (
    <button onClick={onClick} style={{ borderColor: color, color }} className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold hover:opacity-80 transition">
      {icono} {label}
    </button>
  );
}

function ToggleLayer({ activo, onClick, label, icono }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activo ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-outline hover:text-on-surface'}`}>
      {icono} {label}
    </button>
  );
}

export default MapaInteractivo;
