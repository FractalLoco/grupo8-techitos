import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MdMap, MdFilterList, MdRefresh, MdAdd, MdEdit, MdDelete, MdClose,
  MdMyLocation, MdWarning, MdCheckCircle, MdError, MdHome,
  MdOutlineConstruction, MdLocationOn, MdSchedule, MdArrowBack,
  MdSearch, MdInfo, MdGroups, MdPerson,
} from 'react-icons/md';
import { FaExclamationTriangle, FaMapMarkerAlt, FaRoute } from 'react-icons/fa';
import { useAutenticacion } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { obtenerEmergencias, obtenerFamilias } from '../services/emergenciaService';
import { listarObrasPorEmergencia, listarTodasLasObras } from '../services/obraService';
import { listarCuadrillasConEstado, listarTodasLasCuadrillasConEstado } from '../services/cuadrillaService';
import { listarZonasPorEmergencia, listarTodasLasZonas, crearZona, actualizarZona, eliminarZona } from '../services/zonaPeligroService';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS = {
  verde: '#22c55e',
  amarillo: '#eab308',
  rojo: '#E94362',
  azul: '#0092DD',
  gris: '#9ca3af',
};

const STATUS_LABELS = {
  verde: 'En plazo',
  amarillo: 'Riesgo de retraso',
  rojo: 'Requiere intervención',
  azul: 'Sin cuadrilla',
  gris: 'Completada',
};

const crearIconoObra = (color) => L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -28],
});

const ICONOS_OBRA = Object.fromEntries(
  Object.entries(STATUS_COLORS).map(([k, v]) => [k, crearIconoObra(v)])
);

const iconoFamilia = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;background:#6366f1;border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">F</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -13],
});

const iconoEmergencia = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#E94362;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">E</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -17],
});

const iconoPunto = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const CENTRO_DEFAULT = [-36.827, -73.049];
const INTERVALO_REFRESCO = 60;

function CapturadorClic({ activo, onClic }) {
  useMapEvents({ click(e) { if (activo) onClic(e.latlng); } });
  return null;
}

function ControlVuelo({ centro }) {
  const map = useMap();
  useEffect(() => { if (centro) map.flyTo(centro, 15, { duration: 1 }); }, [centro, map]);
  return null;
}

async function geocodificar(direccion) {
  if (!direccion.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&countrycodes=cl&limit=5`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    return data.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: r.display_name,
    }));
  } catch { return null; }
}

function MapaInteractivo() {
  const { usuario } = useAutenticacion();
  const navigate = useNavigate();
  const esCoordinador = usuario?.rol === 'coordinador';

  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [obras, setObras] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [mostrarObras, setMostrarObras] = useState(true);
  const [mostrarFamilias, setMostrarFamilias] = useState(true);
  const [mostrarZonas, setMostrarZonas] = useState(true);
  const [filtroColor, setFiltroColor] = useState('');
  const [filtroEstadoEm, setFiltroEstadoEm] = useState('');

  const [segundosRestantes, setSegundosRestantes] = useState(INTERVALO_REFRESCO);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // Zona de peligro
  const [modoCrearZona, setModoCrearZona] = useState(false);
  const [zonaPendiente, setZonaPendiente] = useState(null);
  const [zonaEditando, setZonaEditando] = useState(null);
  const [mostrarFormZona, setMostrarFormZona] = useState(false);
  const [formZona, setFormZona] = useState({ tipo: 'amarilla', radio: 200, descripcion: '', comentarios: '', emergencia_id_form: '' });

  // Geocodificación
  const [busquedaDir, setBusquedaDir] = useState('');
  const [resultadosDir, setResultadosDir] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [centroVuelo, setCentroVuelo] = useState(null);

  const [confirmar, setConfirmar] = useState({ abierto: false, titulo: '', mensaje: '', onConfirm: () => {} });

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  useEffect(() => {
    obtenerEmergencias().then((data) => {
      const lista = data?.datos?.emergencias || data?.datos || [];
      setEmergencias(Array.isArray(lista) ? lista : []);
    }).catch(() => mostrarMensaje('error', 'Error al cargar emergencias'));
  }, []);

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
        listaObras = dataObras?.datos?.obras || dataObras?.datos || [];
        listaCuad = dataCuad?.datos?.cuadrillas || [];
        listaFam = dataFam?.datos?.familias || dataFam?.familias || [];
        listaZonas = dataZonas?.datos?.zonas || [];
      } else {
        const [dataObras, dataCuad, dataZonas] = await Promise.all([
          listarTodasLasObras(),
          listarTodasLasCuadrillasConEstado(),
          listarTodasLasZonas(),
        ]);
        listaObras = dataObras?.datos?.obras || dataObras?.datos || [];
        listaCuad = dataCuad?.datos?.cuadrillas || [];
        listaZonas = dataZonas?.datos?.zonas || [];
      }
      const obrasMapeadas = (Array.isArray(listaObras) ? listaObras : []).map((o) => {
        const cuadrilla = listaCuad.find((c) => c.obra_asignada_id === o.id);
        return { ...o, estadoColor: cuadrilla?.estadoColor || 'azul', cuadrilla };
      });
      setObras(obrasMapeadas);
      setCuadrillas(Array.isArray(listaCuad) ? listaCuad : []);
      setFamilias(Array.isArray(listaFam) ? listaFam : []);
      setZonas(Array.isArray(listaZonas) ? listaZonas : []);
      setUltimaActualizacion(new Date());
      setSegundosRestantes(INTERVALO_REFRESCO);
    } catch { mostrarMensaje('error', 'Error al cargar datos del mapa'); }
    finally { setCargando(false); }
  }, [emergenciaId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    const intervalo = setInterval(() => cargarDatos(), INTERVALO_REFRESCO * 1000);
    return () => clearInterval(intervalo);
  }, [cargarDatos]);

  useEffect(() => {
    const tick = setInterval(() => {
      setSegundosRestantes((s) => (s <= 1 ? INTERVALO_REFRESCO : s - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Búsqueda de dirección (geocoding)
  useEffect(() => {
    if (!busquedaDir.trim() || busquedaDir.length < 4) { setResultadosDir([]); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const res = await geocodificar(busquedaDir);
      setResultadosDir(res || []);
      setBuscando(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [busquedaDir]);

  const handleSeleccionarDireccion = (r) => {
    setCentroVuelo([r.lat, r.lng]);
    setResultadosDir([]);
    setBusquedaDir(r.label.split(',')[0]);
  };

  const handleClicMapa = (latlng) => {
    setZonaPendiente(latlng);
    setMostrarFormZona(true);
    setModoCrearZona(false);
  };

  const handleGuardarZona = async (e) => {
    e.preventDefault();
    try {
      if (zonaEditando) {
        await actualizarZona(zonaEditando.id, formZona);
        mostrarMensaje('exito', 'Zona actualizada');
      } else {
        const emId = emergenciaId || formZona.emergencia_id_form;
        if (!emId) { mostrarMensaje('error', 'Selecciona una emergencia'); return; }
        await crearZona({
          emergencia_id: emId, tipo: formZona.tipo,
          lat: zonaPendiente.lat, lng: zonaPendiente.lng,
          radio: Number(formZona.radio), descripcion: formZona.descripcion,
          comentarios: formZona.comentarios,
        });
        mostrarMensaje('exito', 'Zona de peligro creada');
      }
      setMostrarFormZona(false); setZonaPendiente(null); setZonaEditando(null);
      setFormZona({ tipo: 'amarilla', radio: 200, descripcion: '', comentarios: '', emergencia_id_form: '' });
      cargarDatos();
    } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
  };

  const obrasFiltradas = filtroColor ? obras.filter((o) => o.estadoColor === filtroColor) : obras;
  const emergenciasFiltradas = filtroEstadoEm
    ? emergencias.filter((e) => e.estado === filtroEstadoEm)
    : emergencias;

  const emergenciaActual = emergencias.find((e) => String(e.id) === String(emergenciaId));
  const centroMapa = (() => {
    if (emergenciaActual?.lat != null && emergenciaActual?.lng != null) return [Number(emergenciaActual.lat), Number(emergenciaActual.lng)];
    if (obras.length > 0 && obras[0].lat != null) return [Number(obras[0].lat), Number(obras[0].lng)];
    return CENTRO_DEFAULT;
  })();

  const resumenEmergencia = (emId) => {
    const obrasEm = obras.filter((o) => o.emergencia_id === emId);
    return {
      total: obrasEm.length,
      rojas: obrasEm.filter((o) => o.estadoColor === 'rojo').length,
      amarillas: obrasEm.filter((o) => o.estadoColor === 'amarillo').length,
    };
  };

  const abrirGoogleMaps = (lat, lng) => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  const abrirWaze = (lat, lng) => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');

  const volverAtras = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/inicio');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {mensaje && (
        <div className={`toast-${mensaje.tipo === 'exito' ? 'success' : 'error'}`}>
          {mensaje.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
          {mensaje.texto}
        </div>
      )}

      {modoCrearZona && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] bg-[#835100] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl flex items-center gap-2 animate-fadeIn">
          <MdMyLocation className="animate-pulse" />
          Haz clic en el mapa para colocar la zona de peligro
          <button onClick={() => setModoCrearZona(false)} className="ml-1 hover:bg-white/20 rounded-full p-0.5"><MdClose /></button>
        </div>
      )}

      <div className="flex" style={{ height: '100vh' }}>
        {/* SIDEBAR */}
        <aside className="w-72 bg-primary-dark flex flex-col flex-shrink-0 overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <button
                type="button"
                onClick={volverAtras}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-all hover:-translate-x-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Volver a la página anterior"
                title="Volver atrás"
              >
                <MdArrowBack className="text-base transition-transform group-hover:-translate-x-0.5" />
                Volver
              </button>
              <img src="/logo-techo-blanco-oficial.png" alt="TECHO" className="h-8 w-auto" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <MdMap className="text-white/80 text-lg" />
              <h2 className="text-white font-bold text-sm tracking-wide">Mapa Interactivo</h2>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                <MdOutlineConstruction className="text-xs" /> {obras.length} obras
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                <FaMapMarkerAlt className="text-[9px]" /> {zonas.length} zonas
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                <MdHome className="text-xs" /> {familias.length} familias
              </span>
            </div>
          </div>

          {/* Buscador de direcciones */}
          <div className="px-3 pt-3 pb-1 relative">
            <div className="relative">
              <MdSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-sm" />
              <input
                type="text"
                placeholder="Buscar dirección..."
                value={busquedaDir}
                onChange={(e) => setBusquedaDir(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 text-white text-xs placeholder:text-white/40 border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              />
              {buscando && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            </div>
            {resultadosDir.length > 0 && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-2xl border border-outline-variant z-[9999] max-h-48 overflow-y-auto">
                {resultadosDir.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSeleccionarDireccion(r)}
                    className="w-full text-left px-3 py-2 text-xs text-on-surface hover:bg-surface-container-low border-b border-outline-variant/60 last:border-0 flex items-start gap-2"
                  >
                    <MdLocationOn className="text-primary text-sm flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filtro emergencias */}
          <div className="px-3 pt-2 pb-1">
            <p className="text-white/35 text-[10px] uppercase tracking-widest font-bold mb-1.5 px-1">Estado emergencia</p>
            <div className="flex gap-1">
              {[{ val: '', label: 'Todas' }, { val: 'activa', label: 'Activas' }, { val: 'cerrada', label: 'Cerradas' }].map(({ val, label }) => (
                <button key={val} onClick={() => setFiltroEstadoEm(val)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    filtroEstadoEm === val ? 'bg-primary text-white shadow-sm' : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Vista todas */}
          <div className="px-3 pb-1">
            <p className="text-white/35 text-[10px] uppercase tracking-widest font-bold mb-1.5 px-1 mt-1">Vista</p>
            <button onClick={() => setEmergenciaId('')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                !emergenciaId ? 'bg-primary text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${!emergenciaId ? 'bg-white/20' : 'bg-white/10'}`}>
                <MdMap className="text-sm text-white" />
              </div>
              <div className="text-left min-w-0">
                <p className="leading-tight truncate">Todas las emergencias</p>
                <p className="text-[11px] leading-tight mt-0.5 text-white/50">{obras.length} obras · {cuadrillas.length} cuadrillas</p>
              </div>
            </button>
          </div>

          <div className="mx-3 border-t border-white/10" />

          {/* Lista emergencias */}
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
            <p className="text-white/35 text-[10px] uppercase tracking-widest font-bold mb-1.5 px-1">Emergencias ({emergenciasFiltradas.length})</p>
            {emergenciasFiltradas.length === 0 && <p className="text-white/30 text-xs text-center py-8">Sin emergencias</p>}
            {emergenciasFiltradas.map((em) => {
              const activa = String(emergenciaId) === String(em.id);
              const resumen = resumenEmergencia(em.id);
              return (
                <button key={em.id} onClick={() => setEmergenciaId(activa ? '' : String(em.id))}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    activa ? 'bg-primary text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}>
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${activa ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}>
                      {em.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${activa ? 'border-primary-dark' : 'border-primary-dark'} ${em.estado === 'activa' ? 'bg-[#22c55e]' : 'bg-gray-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-tight">{em.nombre}</p>
                    <p className="text-[11px] leading-tight mt-0.5 truncate text-white/40">
                      {em.estado === 'activa' ? 'Activa' : 'Cerrada'}
                      {em.direccion ? ` · ${em.direccion}` : ''}
                    </p>
                    {!emergenciaId && resumen.total > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white/60">{resumen.total} obras</span>
                        {resumen.rojas > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E94362]/30 text-[#FFDAD6]">{resumen.rojas} roja{resumen.rojas > 1 ? 's' : ''}</span>}
                        {resumen.amarillas > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#835100]/30 text-[#FFDDB9]">{resumen.amarillas} alerta{resumen.amarillas > 1 ? 's' : ''}</span>}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Auto-refresh */}
          <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2 bg-black/20">
            {cargando ? (
              <><div className="w-2 h-2 rounded-full bg-[#835100] animate-pulse flex-shrink-0" /><span className="text-white/40 text-xs">Actualizando mapa...</span></>
            ) : (
              <><div className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
                <span className="text-white/40 text-xs flex-1">
                  {ultimaActualizacion ? `Act. ${ultimaActualizacion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Conectado'}
                </span>
                <span className="text-white/30 text-[10px] flex-shrink-0 flex items-center gap-1"><MdSchedule className="text-xs" />{segundosRestantes}s</span>
              </>
            )}
          </div>
        </aside>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de controles */}
          <div className="bg-white border-b border-outline-variant px-4 py-2 flex flex-wrap items-center gap-2 z-10 shadow-sm">
            <div className="flex items-center gap-2 pr-3 border-r border-outline-variant">
              <MdLocationOn className="text-primary text-base" />
              <span className="text-on-surface text-sm font-semibold">{emergenciaActual ? emergenciaActual.nombre : 'Vista global'}</span>
              {emergenciaActual && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  emergenciaActual.estado === 'activa' ? 'bg-green-50 text-[#006D37]' : 'bg-gray-100 text-[#6F7882]'
                }`}>{emergenciaActual.estado}</span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <MdFilterList className="text-outline text-sm" />
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setFiltroColor(filtroColor === k ? '' : k)}
                  className={`filter-btn ${filtroColor === k ? '!bg-primary !text-white !border-primary' : ''}`}
                  style={filtroColor === k ? {} : {}}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: STATUS_COLORS[k] }} />
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <ToggleLayer activo={mostrarObras} onClick={() => setMostrarObras(!mostrarObras)} label="Obras" icono={<MdOutlineConstruction />} />
              <ToggleLayer activo={mostrarZonas} onClick={() => setMostrarZonas(!mostrarZonas)} label="Zonas" icono={<MdWarning />} />
              {emergenciaId && <ToggleLayer activo={mostrarFamilias} onClick={() => setMostrarFamilias(!mostrarFamilias)} label="Familias" icono={<MdHome />} />}
              {esCoordinador && (
                <button onClick={() => setModoCrearZona(!modoCrearZona)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    modoCrearZona ? 'bg-[#835100] text-white border-[#835100]' : 'bg-amber-50 text-[#835100] border-[#835100]/30 hover:bg-amber-100'
                  }`}><MdAdd /> Zona peligro</button>
              )}
              <button onClick={cargarDatos}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-lg text-xs text-on-surface-variant hover:text-on-surface transition border border-outline-variant">
                <MdRefresh className={cargando ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Mapa */}
          <div className="flex-1 relative">
            {cargando && obras.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 bg-surface-container-low">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-outline text-sm">Cargando datos del mapa...</span>
              </div>
            ) : (
              <MapContainer key={emergenciaId || 'global'} center={centroMapa} zoom={13} style={{ height: '100%', width: '100%' }} className="z-0">
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <CapturadorClic activo={modoCrearZona} onClic={handleClicMapa} />
                <ControlVuelo centro={centroVuelo} />

                {!emergenciaId && emergencias.map((em) =>
                  em.lat != null && em.lng != null ? (
                    <Marker key={`em-${em.id}`} position={[Number(em.lat), Number(em.lng)]} icon={iconoEmergencia}>
                      <Popup maxWidth={260}>
                        <div className="min-w-[200px]">
                          <strong className="text-on-surface text-sm block mb-1">{em.nombre}</strong>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${em.estado === 'activa' ? 'bg-green-50 text-[#006D37]' : 'bg-gray-100 text-[#6F7882]'}`}>{em.estado}</span>
                          {em.direccion && <p className="text-xs text-on-surface-variant mt-1">{em.direccion}</p>}
                          <p className="text-xs text-outline font-mono mt-1">{Number(em.lat).toFixed(5)}, {Number(em.lng).toFixed(5)}</p>
                          <button onClick={() => setEmergenciaId(String(em.id))}
                            className="mt-2 w-full py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition">Ver esta emergencia</button>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                )}

                {emergenciaActual?.lat != null && emergenciaActual?.lng != null && (
                  <Marker position={[Number(emergenciaActual.lat), Number(emergenciaActual.lng)]} icon={iconoEmergencia}>
                    <Popup maxWidth={280}>
                      <div className="min-w-[210px]">
                        <strong className="text-on-surface text-sm block mb-1">{emergenciaActual.nombre}</strong>
                        {emergenciaActual.direccion && <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1"><FaMapMarkerAlt className="text-outline flex-shrink-0" />{emergenciaActual.direccion}</p>}
                        {emergenciaActual.descripcion && <p className="text-xs text-on-surface-variant mb-1">{emergenciaActual.descripcion}</p>}
                        <p className="text-xs text-outline font-mono mb-2">{Number(emergenciaActual.lat).toFixed(5)}, {Number(emergenciaActual.lng).toFixed(5)}</p>
                        <div className="flex gap-2 mt-2">
                          <BtnMapa icono={<FaRoute />} label="Google Maps" onClick={() => abrirGoogleMaps(emergenciaActual.lat, emergenciaActual.lng)} color="#4285f4" />
                          <BtnMapa icono={<FaMapMarkerAlt />} label="Waze" onClick={() => abrirWaze(emergenciaActual.lat, emergenciaActual.lng)} color="#33ccff" />
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {mostrarObras && obrasFiltradas.map((obra) =>
                  obra.lat && obra.lng ? (
                    <Marker key={`obra-${obra.id}`} position={[obra.lat, obra.lng]} icon={ICONOS_OBRA[obra.estadoColor] || ICONOS_OBRA.azul}>
                      <Popup maxWidth={300}><PopupObra obra={obra} onGoogleMaps={abrirGoogleMaps} onWaze={abrirWaze} onVerEmergencia={(id) => setEmergenciaId(String(id))} modoGlobal={!emergenciaId} /></Popup>
                    </Marker>
                  ) : null
                )}

                {mostrarFamilias && familias.map((fam) =>
                  fam.lat && fam.lng ? (
                    <Marker key={`fam-${fam.id}`} position={[fam.lat, fam.lng]} icon={iconoFamilia}>
                      <Popup maxWidth={280}><PopupFamilia fam={fam} onGoogleMaps={abrirGoogleMaps} onWaze={abrirWaze} /></Popup>
                    </Marker>
                  ) : null
                )}

                {mostrarZonas && zonas.map((zona) => (
                  <Circle key={`zona-${zona.id}`} center={[zona.lat, zona.lng]} radius={zona.radio}
                    pathOptions={{ color: zona.tipo === 'roja' ? '#E94362' : '#eab308', fillColor: zona.tipo === 'roja' ? '#E94362' : '#eab308', fillOpacity: 0.2, weight: 2 }}>
                    <Popup maxWidth={280}><PopupZona zona={zona} esCoordinador={esCoordinador} onEditar={(z) => { setZonaEditando(z); setFormZona({ tipo: z.tipo, radio: z.radio, descripcion: z.descripcion || '', comentarios: z.comentarios || '', emergencia_id_form: '' }); setMostrarFormZona(true); }} onEliminar={(id) => setConfirmar({ abierto: true, titulo: 'Eliminar zona', mensaje: '¿Eliminar esta zona de peligro del mapa?', onConfirm: async () => { setConfirmar((c) => ({ ...c, abierto: false })); try { await eliminarZona(id); mostrarMensaje('exito', 'Zona eliminada'); cargarDatos(); } catch (err) { mostrarMensaje('error', err.message); } } })} /></Popup>
                  </Circle>
                ))}
              </MapContainer>
            )}
          </div>

          {/* Leyenda */}
          <div className="bg-white border-t border-outline-variant px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-outline font-bold uppercase tracking-wide text-[10px] pr-3 border-r border-outline-variant">Leyenda</span>
            <div className="flex items-center gap-3 flex-wrap pr-3 border-r border-outline-variant">
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[k] }} />{v}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-2 text-on-surface-variant"><span className="inline-block w-8 h-1.5 rounded-full" style={{ background: '#eab308', opacity: 0.7 }} />Zona amarilla</span>
            <span className="flex items-center gap-2 text-on-surface-variant"><span className="inline-block w-8 h-1.5 rounded-full" style={{ background: '#E94362', opacity: 0.7 }} />Zona roja</span>
            {emergenciaId && (
              <><span className="flex items-center gap-1.5 text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-full bg-[#E94362]" />Emergencia</span>
                <span className="flex items-center gap-1.5 text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />Familia</span></>
            )}
          </div>
        </div>
      </div>

      {/* Modal: crear/editar zona */}
      {mostrarFormZona && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setMostrarFormZona(false); setZonaEditando(null); setZonaPendiente(null); } }}>
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className={formZona.tipo === 'roja' ? 'text-[#E94362]' : 'text-[#835100]'} />
                <div>
                  <h2 className="font-bold text-on-surface text-sm">{zonaEditando ? 'Editar zona de peligro' : 'Nueva zona de peligro'}</h2>
                  <p className="text-xs text-outline mt-0.5">Define el tipo, radio y ubicación de la zona</p>
                </div>
              </div>
              <button onClick={() => { setMostrarFormZona(false); setZonaEditando(null); setZonaPendiente(null); }} className="text-outline hover:text-on-surface-variant ml-2"><MdClose className="text-xl" /></button>
            </div>
            <form onSubmit={handleGuardarZona} className="modal-body flex flex-col gap-4">
              {!zonaEditando && !emergenciaId && (
                <div>
                  <label className="label">Emergencia <span className="text-error">*</span></label>
                  <select required className="input-field" value={formZona.emergencia_id_form} onChange={(e) => setFormZona({ ...formZona, emergencia_id_form: e.target.value })}>
                    <option value="">— Selecciona la emergencia —</option>
                    {emergencias.filter((em) => em.estado === 'activa').map((em) => (
                      <option key={em.id} value={em.id}>{em.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Tipo de zona</label>
                <div className="flex gap-3">
                  {['amarilla', 'roja'].map((t) => (
                    <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-semibold transition ${
                      formZona.tipo === t ? (t === 'roja' ? 'border-[#E94362] bg-red-50 text-[#E94362]' : 'border-[#835100] bg-amber-50 text-[#835100]') : 'border-outline-variant text-on-surface-variant hover:border-outline'
                    }`}>
                      <input type="radio" className="sr-only" value={t} checked={formZona.tipo === t} onChange={() => setFormZona({ ...formZona, tipo: t })} />
                      <FaExclamationTriangle className={t === 'roja' ? 'text-[#E94362]' : 'text-[#835100]'} />
                      {t === 'amarilla' ? 'Amarilla (precaución)' : 'Roja (bloqueada)'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Radio (metros)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={50} max={5000} step={50} value={formZona.radio} onChange={(e) => setFormZona({ ...formZona, radio: Number(e.target.value) })} className="flex-1 accent-primary" />
                  <span className="text-sm font-bold text-primary w-16 text-right">{formZona.radio} m</span>
                </div>
              </div>
              <div>
                <label className="label">Descripción</label>
                <input className="input-field" placeholder="Ej: Zona inundada con lodo" value={formZona.descripcion} onChange={(e) => setFormZona({ ...formZona, descripcion: e.target.value })} />
              </div>
              <div>
                <label className="label">Comentarios adicionales</label>
                <textarea rows={2} className="input-field resize-none" placeholder="Notas sobre el estado actual..." value={formZona.comentarios} onChange={(e) => setFormZona({ ...formZona, comentarios: e.target.value })} />
              </div>
              {!zonaEditando && zonaPendiente && (
                <div className="bg-surface-container-low rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                  <MdLocationOn className="text-primary flex-shrink-0" />
                  <span className="font-mono text-on-surface-variant">Lat: {zonaPendiente.lat.toFixed(5)}, Lng: {zonaPendiente.lng.toFixed(5)}</span>
                </div>
              )}
              <button type="submit" className={`w-full py-2.5 font-semibold text-white rounded-xl transition ${formZona.tipo === 'roja' ? 'bg-[#E94362] hover:bg-[#BA1A1A]' : 'bg-[#835100] hover:bg-[#634000]'}`}>
                {zonaEditando ? 'Guardar cambios' : 'Crear zona de peligro'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Modal
        open={confirmar.abierto}
        onClose={() => setConfirmar({ ...confirmar, abierto: false })}
        title={confirmar.titulo}
        icon={<MdWarning className="text-error text-xl" />}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-amber-50 border border-[#835100]/30 rounded-xl px-4 py-3 text-sm text-[#835100]">
            {confirmar.mensaje}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={confirmar.onConfirm} className="flex-1">
              <MdCheckCircle /> Confirmar
            </Button>
            <Button variant="ghost" onClick={() => setConfirmar({ ...confirmar, abierto: false })} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PopupObra({ obra, onGoogleMaps, onWaze, onVerEmergencia, modoGlobal }) {
  return (
    <div className="min-w-[220px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[obra.estadoColor] || '#9ca3af' }} />
        <strong className="text-on-surface text-sm">{obra.nombre}</strong>
      </div>
      {obra.descripcion && <p className="text-xs text-on-surface-variant mb-1">{obra.descripcion}</p>}
      {obra.direccion && <p className="text-xs text-on-surface-variant mb-1 flex items-center gap-1"><FaMapMarkerAlt className="text-outline flex-shrink-0" />{obra.direccion}</p>}
      <p className="text-xs text-outline font-mono mb-2">{obra.lat?.toFixed(5)}, {obra.lng?.toFixed(5)}</p>
      <div className="flex items-center gap-1 text-xs mb-1">
        <span className="font-semibold text-on-surface-variant">Estado:</span>
        <span style={{ color: STATUS_COLORS[obra.estadoColor] }} className="font-semibold">{STATUS_LABELS[obra.estadoColor] || obra.estadoColor}</span>
      </div>
      {obra.cuadrilla && <p className="text-xs text-on-surface-variant mb-1">Cuadrilla: <strong>{obra.cuadrilla.nombre}</strong> · Fase: {obra.cuadrilla.fase || '—'}</p>}
      {obra.cuadrilla?.plazo_dias && <p className="text-xs text-on-surface-variant mb-2">Plazo: <strong>{obra.cuadrilla.plazo_dias} días</strong></p>}
      {modoGlobal && obra.emergencia_id && onVerEmergencia && (
        <button onClick={() => onVerEmergencia(obra.emergencia_id)} className="mb-2 w-full py-1 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-lg transition">Ver emergencia</button>
      )}
      <div className="flex gap-2 mt-1">
        <BtnMapa icono={<FaRoute />} label="Google Maps" onClick={() => onGoogleMaps(obra.lat, obra.lng)} color="#4285f4" />
        <BtnMapa icono={<FaMapMarkerAlt />} label="Waze" onClick={() => onWaze(obra.lat, obra.lng)} color="#33ccff" />
      </div>
    </div>
  );
}

function PopupFamilia({ fam, onGoogleMaps, onWaze }) {
  const prioridadColor = { alta: '#E94362', normal: '#0092DD', baja: '#9ca3af' };
  return (
    <div className="min-w-[210px]">
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
    <div className="min-w-[210px]">
      <div className="flex items-center gap-2 mb-1">
        <FaExclamationTriangle style={{ color: esRoja ? '#E94362' : '#eab308' }} />
        <strong style={{ color: esRoja ? '#E94362' : '#835100' }}>Zona {esRoja ? 'Roja — Bloqueada' : 'Amarilla — Precaución'}</strong>
      </div>
      <p className="text-xs text-on-surface-variant mb-0.5">Radio: <strong>{zona.radio} m</strong></p>
      <p className="text-xs text-outline font-mono mb-1">{zona.lat?.toFixed(5)}, {zona.lng?.toFixed(5)}</p>
      {zona.descripcion && <p className="text-xs text-on-surface-variant mb-1">{zona.descripcion}</p>}
      {zona.comentarios && <p className="text-xs text-on-surface-variant italic mb-2 border-t border-outline-variant/60 pt-1">{zona.comentarios}</p>}
      {esCoordinador && (
        <div className="flex gap-2 mt-1">
          <button onClick={() => onEditar(zona)} className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold"><MdEdit /> Editar</button>
          <button onClick={() => onEliminar(zona.id)} className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-[#E94362] text-xs font-semibold"><MdDelete /> Eliminar</button>
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
    <button onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
        activo ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary'
      }`}>
      {icono} {label}
    </button>
  );
}

export default MapaInteractivo;
