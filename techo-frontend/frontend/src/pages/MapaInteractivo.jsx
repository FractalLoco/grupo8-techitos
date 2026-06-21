import { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'react-icons/md';
import { FaExclamationTriangle, FaMapMarkerAlt, FaRoute } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerEmergencias } from '../services/emergenciaService';
import { listarObrasPorEmergencia } from '../services/obraService';
import { listarCuadrillasConEstado } from '../services/cuadrillaService';
import { obtenerFamilias } from '../services/emergenciaService';
import { listarZonasPorEmergencia, crearZona, actualizarZona, eliminarZona } from '../services/zonaPeligroService';

// Leaflet necesita estos íconos corregidos en el entorno de Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Íconos SVG en base64 para los distintos tipos de marcador
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
  verde: { label: 'En plazo', hex: '#22c55e' },
  amarillo: { label: 'Riesgo de retraso', hex: '#eab308' },
  rojo: { label: 'Requiere intervención', hex: '#ef4444' },
  azul: { label: 'Sin obra asignada', hex: '#3b82f6' },
  gris: { label: 'Completada', hex: '#9ca3af' },
};

// Coordenadas por defecto: Gran Concepción, Chile
const CENTRO_DEFAULT = [-36.827, -73.049];

// Captura el clic en el mapa para colocar nuevas zonas
function CapturadorClic({ activo, onClic }) {
  useMapEvents({
    click(e) {
      if (activo) onClic(e.latlng);
    },
  });
  return null;
}

function MapaInteractivo() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';

  // ── Estado general ──────────────────────────────────────────────────────────
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [obras, setObras] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // ── Filtros de visualización ────────────────────────────────────────────────
  const [mostrarObras, setMostrarObras] = useState(true);
  const [mostrarFamilias, setMostrarFamilias] = useState(true);
  const [mostrarZonas, setMostrarZonas] = useState(true);
  const [filtroColor, setFiltroColor] = useState('');

  // ── Zona de peligro: creación y edición ────────────────────────────────────
  const [modoCrearZona, setModoCrearZona] = useState(false);
  const [formularioZona, setFormularioZona] = useState({ tipo: 'amarilla', radio: 200, descripcion: '', comentarios: '' });
  const [zonaPendiente, setZonaPendiente] = useState(null); // { lat, lng } antes de confirmar
  const [zonaEditando, setZonaEditando] = useState(null);
  const [mostrarFormZona, setMostrarFormZona] = useState(false);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  // ── Carga de emergencias ────────────────────────────────────────────────────
  useEffect(() => {
    obtenerEmergencias()
      .then((data) => {
        const lista = data?.datos?.emergencias || data?.datos || [];
        setEmergencias(Array.isArray(lista) ? lista : []);
      })
      .catch(() => mostrarMensaje('error', 'Error al cargar emergencias'));
  }, []);

  // ── Carga de datos del mapa ─────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    if (!emergenciaId) return;
    setCargando(true);
    try {
      const [dataObras, dataCuad, dataFam, dataZonas] = await Promise.all([
        listarObrasPorEmergencia(emergenciaId),
        listarCuadrillasConEstado(emergenciaId),
        obtenerFamilias(emergenciaId),
        listarZonasPorEmergencia(emergenciaId),
      ]);

      const listaObras = dataObras?.datos?.obras || dataObras?.datos || [];
      const listaCuad = dataCuad?.datos?.cuadrillas || [];
      const listaFam = dataFam?.datos?.familias || dataFam?.familias || [];
      const listaZonas = dataZonas?.datos?.zonas || [];

      // Enriquezco cada obra con el color de estado de su cuadrilla
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
    } catch {
      mostrarMensaje('error', 'Error al cargar datos del mapa');
    } finally {
      setCargando(false);
    }
  }, [emergenciaId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ── Filtrado de obras por color ─────────────────────────────────────────────
  const obrasFiltradas = filtroColor
    ? obras.filter((o) => o.estadoColor === filtroColor)
    : obras;

  // ── Creación de zona de peligro ─────────────────────────────────────────────
  const handleClicMapa = (latlng) => {
    setZonaPendiente(latlng);
    setMostrarFormZona(true);
    setModoCrearZona(false);
  };

  const handleGuardarZona = async (e) => {
    e.preventDefault();
    try {
      if (zonaEditando) {
        await actualizarZona(zonaEditando.id, formularioZona);
        mostrarMensaje('exito', 'Zona actualizada');
      } else {
        await crearZona({
          emergencia_id: emergenciaId,
          tipo: formularioZona.tipo,
          lat: zonaPendiente.lat,
          lng: zonaPendiente.lng,
          radio: Number(formularioZona.radio),
          descripcion: formularioZona.descripcion,
          comentarios: formularioZona.comentarios,
        });
        mostrarMensaje('exito', 'Zona de peligro creada');
      }
      setMostrarFormZona(false);
      setZonaPendiente(null);
      setZonaEditando(null);
      setFormularioZona({ tipo: 'amarilla', radio: 200, descripcion: '', comentarios: '' });
      cargarDatos();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleEditarZona = (zona) => {
    setZonaEditando(zona);
    setFormularioZona({
      tipo: zona.tipo,
      radio: zona.radio,
      descripcion: zona.descripcion || '',
      comentarios: zona.comentarios || '',
    });
    setMostrarFormZona(true);
  };

  const handleEliminarZona = async (id) => {
    if (!window.confirm('¿Eliminar esta zona de peligro del mapa?')) return;
    try {
      await eliminarZona(id);
      mostrarMensaje('exito', 'Zona eliminada');
      cargarDatos();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  // ── Helpers de navegación ───────────────────────────────────────────────────
  const abrirGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const abrirWaze = (lat, lng) => {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
  };

  // ── Calcular centro del mapa según datos cargados ───────────────────────────
  const emergenciaActual = emergencias.find((e) => String(e.id) === String(emergenciaId));

  const centroMapa = (() => {
    if (emergenciaActual?.lat != null && emergenciaActual?.lng != null) {
      return [Number(emergenciaActual.lat), Number(emergenciaActual.lng)];
    }

    if (obras.length > 0 && obras[0].lat != null && obras[0].lng != null) {
      return [Number(obras[0].lat), Number(obras[0].lng)];
    }

    return CENTRO_DEFAULT;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-[76px] flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>

        {/* ── Barra superior de controles ──────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3 z-10 shadow-md">
          <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
            <MdMap className="text-xl text-techo-primary" />
            <span className="font-bold text-techo-primary text-sm tracking-tight">Mapa Interactivo</span>
          </div>

          {/* Selector de emergencia */}
          <select
            className="border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary min-w-[200px] bg-gray-50"
            value={emergenciaId}
            onChange={(e) => setEmergenciaId(e.target.value)}
          >
            <option value="">— Selecciona emergencia —</option>
            {emergencias.map((em) => (
              <option key={em.id} value={em.id}>{em.nombre}</option>
            ))}
          </select>

          {/* Filtro por color de estado */}
          {emergenciaId && (
            <div className="flex items-center gap-1.5 flex-wrap pl-2 border-l border-gray-200">
              <MdFilterList className="text-gray-400 text-base" />
              {Object.entries(COLORES_ESTADO).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFiltroColor(filtroColor === k ? '' : k)}
                  style={{ borderColor: filtroColor === k ? v.hex : undefined, backgroundColor: filtroColor === k ? v.hex + '22' : undefined, color: filtroColor === k ? v.hex : undefined }}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${filtroColor === k ? '' : 'border-gray-200 text-gray-500 hover:border-gray-400 bg-gray-50'}`}
                  title={v.label}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: v.hex }}></span>
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* Toggles de capas */}
          {emergenciaId && (
            <div className="flex items-center gap-2 ml-auto pl-2 border-l border-gray-200">
              <ToggleLayer activo={mostrarObras} onClick={() => setMostrarObras(!mostrarObras)} label="Obras" icono={<MdOutlineConstruction />} />
              <ToggleLayer activo={mostrarFamilias} onClick={() => setMostrarFamilias(!mostrarFamilias)} label="Familias" icono={<MdHome />} />
              <ToggleLayer activo={mostrarZonas} onClick={() => setMostrarZonas(!mostrarZonas)} label="Zonas" icono={<MdWarning />} />
              {esCoordinador && (
                <button
                  onClick={() => setModoCrearZona(!modoCrearZona)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${modoCrearZona ? 'bg-techo-accent text-white border-techo-accent shadow-sm' : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'}`}
                >
                  <MdAdd /> Zona peligro
                </button>
              )}
              <button
                onClick={cargarDatos}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs text-gray-600 transition border border-gray-200"
                title="Recargar datos"
              >
                <MdRefresh />
              </button>
            </div>
          )}
        </div>

        {/* Toast */}
        {mensaje && (
          <div className={`absolute top-[92px] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold ${mensaje.tipo === 'exito' ? 'bg-techo-success text-white' : 'bg-techo-danger text-white'}`}>
            {mensaje.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
            {mensaje.texto}
          </div>
        )}

        {/* Banner: modo colocar zona */}
        {modoCrearZona && (
          <div className="absolute top-[112px] left-1/2 -translate-x-1/2 z-[9998] bg-techo-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl flex items-center gap-2">
            <MdMyLocation className="animate-pulse text-base" />
            Haz clic en el mapa para colocar la zona de peligro
            <button
              onClick={() => setModoCrearZona(false)}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition"
              title="Cancelar"
            >
              <MdClose className="text-sm" />
            </button>
          </div>
        )}

        {/* ── Mapa Leaflet ─────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {!emergenciaId ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <MdMap className="text-7xl opacity-20" />
              <p className="text-base font-medium text-gray-500">Selecciona una emergencia</p>
              <p className="text-sm text-gray-400">para visualizar el mapa con obras, familias y zonas</p>
            </div>
          ) : cargando ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <div className="w-10 h-10 border-2 border-techo-secondary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando datos del mapa...</span>
            </div>
          ) : (
            <MapContainer
              key={emergenciaId}
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

              {/* Marcador de la emergencia seleccionada */}
              {emergenciaActual?.lat != null && emergenciaActual?.lng != null && (
                <Marker
                  key={`emergencia-${emergenciaActual.id}`}
                  position={[Number(emergenciaActual.lat), Number(emergenciaActual.lng)]}
                  icon={iconoEmergencia}
                >
                  <Popup maxWidth={280}>
                    <div style={{ minWidth: 210 }}>
                      <strong className="text-gray-800 text-sm block mb-1">
                        {emergenciaActual.nombre}
                      </strong>
                      {emergenciaActual.direccion && (
                        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                          <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
                          {emergenciaActual.direccion}
                        </p>
                      )}
                      {emergenciaActual.descripcion && (
                        <p className="text-xs text-gray-500 mb-1">
                          {emergenciaActual.descripcion}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 font-mono mb-2">
                        {Number(emergenciaActual.lat).toFixed(5)}, {Number(emergenciaActual.lng).toFixed(5)}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <BtnMapa
                          icono={<FaRoute />}
                          label="Google Maps"
                          onClick={() => abrirGoogleMaps(emergenciaActual.lat, emergenciaActual.lng)}
                          color="#4285f4"
                        />
                        <BtnMapa
                          icono={<FaMapMarkerAlt />}
                          label="Waze"
                          onClick={() => abrirWaze(emergenciaActual.lat, emergenciaActual.lng)}
                          color="#33ccff"
                        />
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Marcadores de obras */}
              {mostrarObras &&
                obrasFiltradas.map((obra) =>
                  obra.lat && obra.lng ? (
                    <Marker
                      key={`obra-${obra.id}`}
                      position={[obra.lat, obra.lng]}
                      icon={ICONOS_OBRA[obra.estadoColor] || ICONOS_OBRA.azul}
                    >
                      <Popup maxWidth={300}>
                        <PopupObra obra={obra} onGoogleMaps={abrirGoogleMaps} onWaze={abrirWaze} />
                      </Popup>
                    </Marker>
                  ) : null
                )}

              {/* Marcadores de familias */}
              {mostrarFamilias &&
                familias.map((fam) =>
                  fam.lat && fam.lng ? (
                    <Marker key={`fam-${fam.id}`} position={[fam.lat, fam.lng]} icon={iconoFamilia}>
                      <Popup maxWidth={280}>
                        <PopupFamilia fam={fam} onGoogleMaps={abrirGoogleMaps} onWaze={abrirWaze} />
                      </Popup>
                    </Marker>
                  ) : null
                )}

              {/* Círculos de zonas de peligro */}
              {mostrarZonas &&
                zonas.map((zona) => (
                  <Circle
                    key={`zona-${zona.id}`}
                    center={[zona.lat, zona.lng]}
                    radius={zona.radio}
                    pathOptions={{
                      color: zona.tipo === 'roja' ? '#ef4444' : '#eab308',
                      fillColor: zona.tipo === 'roja' ? '#ef4444' : '#eab308',
                      fillOpacity: 0.2,
                      weight: 2,
                    }}
                  >
                    <Popup maxWidth={280}>
                      <PopupZona
                        zona={zona}
                        esCoordinador={esCoordinador}
                        onEditar={handleEditarZona}
                        onEliminar={handleEliminarZona}
                      />
                    </Popup>
                  </Circle>
                ))}
            </MapContainer>
          )}
        </div>

        {/* ── Leyenda ──────────────────────────────────────────────────────── */}
        {emergenciaId && (
          <div className="bg-white border-t border-gray-200 px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="font-bold text-techo-primary text-xs uppercase tracking-wide pr-3 border-r border-gray-200">Leyenda</span>

            <div className="flex items-center gap-3 flex-wrap pr-3 border-r border-gray-200">
              {Object.entries(COLORES_ESTADO).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: v.hex }}></span>
                  {v.label}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block flex-shrink-0"></span>
                Familia afectada
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
              Emergencia
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"></span>
              Familia afectada
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-10 h-2 rounded-full" style={{ background: '#eab308', opacity: 0.6 }}></span>
              Zona amarilla (precaución)
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-10 h-2 rounded-full" style={{ background: '#ef4444', opacity: 0.6 }}></span>
              Zona roja (bloqueada)
            </span>
          </div>
        )}
      </div>

      {/* ── Modal: crear / editar zona de peligro ──────────────────────────── */}
      {mostrarFormZona && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-800">
                {zonaEditando ? 'Editar zona de peligro' : 'Nueva zona de peligro'}
              </h2>
              <button onClick={() => { setMostrarFormZona(false); setZonaEditando(null); setZonaPendiente(null); }} className="text-gray-400 hover:text-gray-600">
                <MdClose className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleGuardarZona} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de zona</label>
                <div className="flex gap-3">
                  {['amarilla', 'roja'].map((t) => (
                    <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 cursor-pointer text-sm font-semibold transition ${formularioZona.tipo === t ? (t === 'roja' ? 'border-red-500 bg-red-50 text-red-700' : 'border-yellow-500 bg-yellow-50 text-yellow-700') : 'border-gray-300 text-gray-500 hover:border-gray-400'}`}>
                      <input type="radio" className="sr-only" value={t} checked={formularioZona.tipo === t} onChange={() => setFormularioZona({ ...formularioZona, tipo: t })} />
                      <FaExclamationTriangle className={t === 'roja' ? 'text-red-500' : 'text-yellow-500'} />
                      {t === 'amarilla' ? 'Amarilla (precaución)' : 'Roja (bloqueada)'}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formularioZona.tipo === 'amarilla' ? 'Se puede pasar pero con cuidado.' : 'Zona completamente bloqueada. No se puede pasar.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Radio (metros)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={formularioZona.radio}
                    onChange={(e) => setFormularioZona({ ...formularioZona, radio: Number(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold text-techo-primary w-16 text-right">{formularioZona.radio} m</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-primary"
                  placeholder="Ej: Zona inundada con lodo"
                  value={formularioZona.descripcion}
                  onChange={(e) => setFormularioZona({ ...formularioZona, descripcion: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Comentarios adicionales</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-primary"
                  placeholder="Notas sobre el estado actual, acciones tomadas, etc."
                  value={formularioZona.comentarios}
                  onChange={(e) => setFormularioZona({ ...formularioZona, comentarios: e.target.value })}
                />
              </div>

              {!zonaEditando && zonaPendiente && (
                <p className="text-xs text-gray-400">
                  Ubicación seleccionada: {zonaPendiente.lat.toFixed(5)}, {zonaPendiente.lng.toFixed(5)}
                </p>
              )}

              <button
                type="submit"
                className={`w-full py-2.5 font-semibold text-white rounded-lg transition ${formularioZona.tipo === 'roja' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}
              >
                {zonaEditando ? 'Guardar cambios' : 'Crear zona de peligro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Popups del mapa ───────────────────────────────────────────────────────────

function PopupObra({ obra, onGoogleMaps, onWaze }) {
  const ci = {
    verde: '#22c55e', amarillo: '#eab308', rojo: '#ef4444', azul: '#3b82f6', gris: '#9ca3af',
  };
  const estadoLabels = {
    verde: 'En plazo', amarillo: 'Riesgo de retraso', rojo: 'Requiere intervención',
    azul: 'Sin cuadrilla', gris: 'Completada',
  };
  return (
    <div style={{ minWidth: 220 }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ci[obra.estadoColor] || '#9ca3af' }}></span>
        <strong className="text-gray-800 text-sm">{obra.nombre}</strong>
      </div>
      {obra.descripcion && <p className="text-xs text-gray-500 mb-1">{obra.descripcion}</p>}
      {obra.direccion && (
        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
          <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
          {obra.direccion}
        </p>
      )}
      <p className="text-xs text-gray-400 font-mono mb-2">
        {obra.lat?.toFixed(5)}, {obra.lng?.toFixed(5)}
      </p>
      <div className="flex items-center gap-1 text-xs mb-1">
        <span className="font-semibold text-gray-600">Estado:</span>
        <span style={{ color: ci[obra.estadoColor] }} className="font-semibold">
          {estadoLabels[obra.estadoColor] || obra.estadoColor}
        </span>
      </div>
      {obra.cuadrilla && (
        <p className="text-xs text-gray-500 mb-2">
          Cuadrilla: <strong>{obra.cuadrilla.nombre}</strong> · Fase: {obra.cuadrilla.fase || '—'}
        </p>
      )}
      <div className="flex gap-2 mt-2">
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
      <strong className="text-gray-800 text-sm block mb-1">{fam.nombre_cabeza_familia}</strong>
      {fam.direccion && (
        <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
          <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
          {fam.direccion}
        </p>
      )}
      <p className="text-xs text-gray-400 font-mono mb-1">{fam.lat?.toFixed(5)}, {fam.lng?.toFixed(5)}</p>
      <div className="flex gap-3 text-xs text-gray-500 mb-1">
        <span>Miembros: <strong>{fam.miembros}</strong></span>
        <span>
          Prioridad:{' '}
          <strong style={{ color: prioridadColor[fam.prioridad] || '#333' }}>{fam.prioridad}</strong>
        </span>
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
        <strong style={{ color: esRoja ? '#ef4444' : '#b45309' }}>
          Zona {esRoja ? 'Roja — Bloqueada' : 'Amarilla — Precaución'}
        </strong>
      </div>
      <p className="text-xs text-gray-500 mb-0.5">Radio: <strong>{zona.radio} m</strong></p>
      <p className="text-xs text-gray-400 font-mono mb-1">{zona.lat?.toFixed(5)}, {zona.lng?.toFixed(5)}</p>
      {zona.descripcion && <p className="text-xs text-gray-600 mb-1">{zona.descripcion}</p>}
      {zona.comentarios && (
        <p className="text-xs text-gray-500 italic mb-2 border-t border-gray-100 pt-1">{zona.comentarios}</p>
      )}
      {esCoordinador && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onEditar(zona)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition"
          >
            <MdEdit /> Editar
          </button>
          <button
            onClick={() => onEliminar(zona.id)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition"
          >
            <MdDelete /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function BtnMapa({ icono, label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{ borderColor: color, color }}
      className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold hover:opacity-80 transition"
    >
      {icono} {label}
    </button>
  );
}

function ToggleLayer({ activo, onClick, label, icono }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${activo ? 'bg-techo-primary text-white border-techo-primary shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-techo-primary hover:text-techo-primary'}`}
    >
      {icono} {label}
    </button>
  );
}

export default MapaInteractivo;
