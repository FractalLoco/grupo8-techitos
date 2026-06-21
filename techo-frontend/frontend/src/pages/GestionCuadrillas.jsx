import { useEffect, useState, useCallback, Fragment } from 'react';
import {
  MdGroups,
  MdAdd,
  MdWarning,
  MdCheckCircle,
  MdBuild,
  MdPersonAdd,
  MdAssignment,
  MdDone,
  MdSwapHoriz,
  MdClose,
  MdRefresh,
  MdOutlineFilterList,
  MdError,
  MdInfo,
  MdPeople,
  MdSchedule,
  MdArrowForward,
  MdConstruction,
  MdLocationOn,
} from 'react-icons/md';
import { FaHardHat, FaWrench, FaExclamationTriangle } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerEmergencias } from '../services/emergenciaService';
import { obtenerUsuarios } from '../services/usuarioService';
import {
  listarCuadrillasConEstado,
  crearCuadrilla,
  agregarMiembro,
  eliminarMiembro,
  asignarObra,
  actualizarFase,
  enviarAlertaEmergencia,
  completarCuadrilla,
  reasignarVoluntario,
  obtenerBalanceHerramientas,
  cerrarBalanceDia,
} from '../services/cuadrillaService';
import { listarObrasPorEmergencia } from '../services/obraService';
import {
  listarHerramientas,
  registrarHerramienta,
  registrarHerramientasMasivas,
  actualizarEstadoHerramienta,
} from '../services/herramientaService';

const COLORES = {
  verde:    { bg: 'bg-green-100',  borde: 'border-green-500',  texto: 'text-green-700',  dot: 'bg-green-500',  label: 'En plazo' },
  amarillo: { bg: 'bg-yellow-100', borde: 'border-yellow-500', texto: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Riesgo de retraso' },
  rojo:     { bg: 'bg-red-100',    borde: 'border-red-500',    texto: 'text-red-700',    dot: 'bg-red-500',    label: 'Requiere intervención' },
  azul:     { bg: 'bg-blue-100',   borde: 'border-blue-500',   texto: 'text-blue-700',   dot: 'bg-blue-500',   label: 'Sin obra asignada' },
  gris:     { bg: 'bg-gray-100',   borde: 'border-gray-400',   texto: 'text-gray-600',   dot: 'bg-gray-400',   label: 'Completada' },
};

const FASES = ['limpieza', 'montaje', 'terminaciones'];

const ESTILOS_HERR = {
  entregada:   { borde: 'border-techo-secondary', badge: 'bg-blue-100 text-blue-800',   label: 'Entregada' },
  buena:       { borde: 'border-techo-success',   badge: 'bg-green-100 text-green-800', label: 'Buena' },
  danada:      { borde: 'border-techo-accent',    badge: 'bg-orange-100 text-orange-800', label: 'Dañada' },
  perdida:     { borde: 'border-techo-danger',    badge: 'bg-red-100 text-red-800',     label: 'Perdida' },
  no_devuelta: { borde: 'border-purple-500',      badge: 'bg-purple-100 text-purple-800', label: 'No devuelta' },
};

function GestionCuadrillas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';

  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [obras, setObras] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroColor, setFiltroColor] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [formCuadrilla, setFormCuadrilla] = useState({ nombre: '', jefe_id: '', plazo_dias: 5 });
  const [mostrarFormCuadrilla, setMostrarFormCuadrilla] = useState(false);

  const [cuadrillaActiva, setCuadrillaActiva] = useState(null);
  const [panel, setPanel] = useState(null);

  const [voluntarioId, setVoluntarioId] = useState('');
  const [habilidades, setHabilidades] = useState('');
  const [obraId, setObraId] = useState('');
  const [faseSeleccionada, setFaseSeleccionada] = useState('');
  const [descripcionAlerta, setDescripcionAlerta] = useState('');
  const [cuadrillaDestinoId, setCuadrillaDestinoId] = useState('');
  const [voluntarioReasignarId, setVoluntarioReasignarId] = useState('');

  const [herramientas, setHerramientas] = useState([]);
  const [nombresHerramientas, setNombresHerramientas] = useState('');
  const [nombreHerramientaIndividual, setNombreHerramientaIndividual] = useState('');
  const [modoReg, setModoReg] = useState('masivo');
  const [filtroHerr, setFiltroHerr] = useState('todos');
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const cargarBase = async () => {
      try {
        const [dataEm, dataUs] = await Promise.all([
          obtenerEmergencias(),
          esCoordinador ? obtenerUsuarios() : Promise.resolve({ datos: { usuarios: [] } }),
        ]);
        const lista = dataEm?.datos?.emergencias || dataEm?.datos || [];
        setEmergencias(Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : []);
        const listaUs = dataUs?.datos?.usuarios || dataUs?.datos || [];
        setUsuarios(Array.isArray(listaUs) ? listaUs : []);
      } catch {
        mostrarMensaje('error', 'Error al cargar datos iniciales');
      }
    };
    cargarBase();
  }, [esCoordinador]);

  const cargarCuadrillas = useCallback(async () => {
    if (!emergenciaId) return;
    setCargando(true);
    try {
      const data = await listarCuadrillasConEstado(emergenciaId, filtroColor || null);
      const lista = data?.datos?.cuadrillas || [];
      setCuadrillas(lista);
      if (esCoordinador) {
        const dataObras = await listarObrasPorEmergencia(emergenciaId);
        const listaObras = dataObras?.datos?.obras || dataObras?.datos || [];
        setObras(Array.isArray(listaObras) ? listaObras : []);
      }
    } catch {
      mostrarMensaje('error', 'Error al cargar cuadrillas');
    } finally {
      setCargando(false);
    }
  }, [emergenciaId, filtroColor, esCoordinador]);

  useEffect(() => {
    cargarCuadrillas();
  }, [cargarCuadrillas]);

  const cuadrillasVisibles = esJefe
    ? cuadrillas.filter((c) => c.jefe_id === usuario?.id)
    : cuadrillas;

  const stats = {
    total: cuadrillasVisibles.length,
    activas: cuadrillasVisibles.filter((c) => c.estado === 'activa').length,
    en_progreso: cuadrillasVisibles.filter((c) => c.estado === 'en_progreso').length,
    completadas: cuadrillasVisibles.filter((c) => c.estado === 'completada').length,
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const abrirPanel = (cuadrilla, tipo) => {
    setCuadrillaActiva(cuadrilla);
    setPanel(tipo);
    setBalance(null);
    setHerramientas([]);
    if (tipo === 'herramientas' || tipo === 'balance') {
      cargarHerramientas(cuadrilla.id);
    }
  };

  const cerrarPanel = () => {
    setPanel(null);
    setCuadrillaActiva(null);
  };

  const cargarHerramientas = async (cuadrillaId) => {
    try {
      const data = await listarHerramientas(cuadrillaId);
      const lista = data?.datos?.herramientas || data?.datos || [];
      setHerramientas(Array.isArray(lista) ? lista : []);
    } catch {
      mostrarMensaje('error', 'Error al cargar herramientas');
    }
  };

  const handleCrearCuadrilla = async (e) => {
    e.preventDefault();
    if (!emergenciaId) return mostrarMensaje('error', 'Selecciona una emergencia primero');
    try {
      await crearCuadrilla({ ...formCuadrilla, emergencia_id: emergenciaId });
      mostrarMensaje('exito', 'Cuadrilla creada correctamente');
      setFormCuadrilla({ nombre: '', jefe_id: '', plazo_dias: 5 });
      setMostrarFormCuadrilla(false);
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleAgregarMiembro = async (e) => {
    e.preventDefault();
    try {
      await agregarMiembro(cuadrillaActiva.id, { voluntarioId, habilidades: habilidades || null });
      mostrarMensaje('exito', 'Miembro agregado');
      setVoluntarioId('');
      setHabilidades('');
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleEliminarMiembro = async (volId) => {
    try {
      await eliminarMiembro(cuadrillaActiva.id, volId);
      mostrarMensaje('exito', 'Miembro eliminado');
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleAsignarObra = async (e) => {
    e.preventDefault();
    try {
      await asignarObra(cuadrillaActiva.id, obraId);
      mostrarMensaje('exito', 'Obra asignada y notificaciones enviadas');
      setObraId('');
      cerrarPanel();
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleCompletarCuadrilla = async (id) => {
    if (!window.confirm('¿Marcar la cuadrilla como completada y liberar a los voluntarios?')) return;
    try {
      await completarCuadrilla(id);
      mostrarMensaje('exito', 'Cuadrilla completada y desarmada');
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleReasignar = async (e) => {
    e.preventDefault();
    try {
      await reasignarVoluntario(cuadrillaActiva.id, voluntarioReasignarId, cuadrillaDestinoId);
      mostrarMensaje('exito', 'Voluntario reasignado');
      setCuadrillaDestinoId('');
      setVoluntarioReasignarId('');
      cerrarPanel();
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleActualizarFase = async (e) => {
    e.preventDefault();
    try {
      await actualizarFase(cuadrillaActiva.id, faseSeleccionada);
      mostrarMensaje('exito', `Fase actualizada a "${faseSeleccionada}"`);
      setFaseSeleccionada('');
      cerrarPanel();
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleEnviarAlerta = async (e) => {
    e.preventDefault();
    try {
      await enviarAlertaEmergencia(cuadrillaActiva.id, descripcionAlerta);
      mostrarMensaje('exito', 'Alerta enviada al coordinador');
      setDescripcionAlerta('');
      cerrarPanel();
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleRegistrarHerramientas = async (e) => {
    e.preventDefault();
    const nombres = nombresHerramientas.split('\n').map((n) => n.trim()).filter(Boolean);
    if (nombres.length === 0) return mostrarMensaje('error', 'Ingresa al menos una herramienta');
    try {
      await registrarHerramientasMasivas(cuadrillaActiva.id, nombres);
      mostrarMensaje('exito', `${nombres.length} herramienta(s) registradas`);
      setNombresHerramientas('');
      cargarHerramientas(cuadrillaActiva.id);
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleRegistrarIndividual = async () => {
    if (!nombreHerramientaIndividual.trim()) return;
    try {
      await registrarHerramienta(cuadrillaActiva.id, nombreHerramientaIndividual.trim());
      mostrarMensaje('exito', 'Herramienta registrada');
      setNombreHerramientaIndividual('');
      cargarHerramientas(cuadrillaActiva.id);
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleCambiarEstadoHerramienta = async (id, estado) => {
    try {
      await actualizarEstadoHerramienta(id, estado);
      cargarHerramientas(cuadrillaActiva.id);
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleCerrarBalance = async () => {
    try {
      const data = await cerrarBalanceDia(cuadrillaActiva.id);
      const bal = data?.datos?.balance || {};
      setBalance(bal);
      mostrarMensaje('exito', 'Balance del día cerrado');
      cargarCuadrillas();
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const handleVerBalance = async () => {
    try {
      const data = await obtenerBalanceHerramientas(cuadrillaActiva.id);
      setBalance(data?.datos?.balance || {});
      setPanel('balance');
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const colorInfo = (c) => COLORES[c] || COLORES.gris;

  const nombreJefe = (jefe_id) => {
    const u = usuarios.find((u) => u.id === jefe_id);
    return u ? u.nombre : '—';
  };

  const nombreObra = (obra_id) => {
    const o = obras.find((o) => o.id === obra_id);
    return o ? o.nombre : null;
  };

  return (
    <div className="min-h-screen bg-techo-light">
      <Navbar />

      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div className="pt-[76px]">
        <div className="bg-techo-primary shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-1">
              <MdGroups className="text-techo-secondary text-2xl flex-shrink-0" />
              <h1 className="text-white font-bold text-lg tracking-tight">Gestión de Cuadrillas</h1>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
              <select
                className="bg-white/10 text-white border border-white/25 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary min-w-[190px]"
                value={emergenciaId}
                onChange={(e) => { setEmergenciaId(e.target.value); setFiltroColor(''); }}
              >
                <option value="" className="text-gray-800 bg-white">— Selecciona emergencia —</option>
                {emergencias.map((em) => (
                  <option key={em.id} value={em.id} className="text-gray-800 bg-white">{em.nombre}</option>
                ))}
              </select>
            </div>

            {esCoordinador && (
              <button
                onClick={() => {
                  if (!emergenciaId) {
                    mostrarMensaje('error', 'Selecciona una emergencia primero');
                    return;
                  }
                  setMostrarFormCuadrilla(true);
                }}
                title={!emergenciaId ? 'Selecciona una emergencia primero' : 'Crear nueva cuadrilla'}
                className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm ${
                  emergenciaId
                    ? 'bg-techo-secondary hover:bg-blue-500 text-white'
                    : 'bg-white/20 text-white/50 cursor-not-allowed'
                }`}
              >
                <MdAdd className="text-base" /> Nueva cuadrilla
              </button>
            )}
          </div>
        </div>

        {/* ── Toast fijo ────────────────────────────────────────────────────── */}
        {mensaje && (
          <div className={`fixed top-[86px] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold animate-fadeIn ${
            mensaje.tipo === 'exito' ? 'bg-techo-success text-white' : 'bg-techo-danger text-white'
          }`}>
            {mensaje.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
            {mensaje.texto}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-6">

          {!emergenciaId ? (
            /* ── Empty state: sin emergencia ─────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-28 text-gray-400">
              <MdGroups className="text-7xl mb-4 opacity-20" />
              <p className="text-base font-medium text-gray-500">Selecciona una emergencia</p>
              <p className="text-sm text-gray-400 mt-1">para ver y gestionar las cuadrillas asignadas</p>
            </div>
          ) : (
            <>
              {/* ── Stats dashboard ──────────────────────────────────────── */}
              {cuadrillasVisibles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <StatCard valor={stats.total} etiqueta="Total" icono={<MdGroups />} colorClase="text-techo-primary" bgClase="bg-blue-50" />
                  <StatCard valor={stats.activas} etiqueta="Activas" icono={<MdPeople />} colorClase="text-blue-600" bgClase="bg-blue-50" />
                  <StatCard valor={stats.en_progreso} etiqueta="En progreso" icono={<MdConstruction />} colorClase="text-orange-600" bgClase="bg-orange-50" />
                  <StatCard valor={stats.completadas} etiqueta="Completadas" icono={<MdCheckCircle />} colorClase="text-techo-success" bgClase="bg-green-50" />
                </div>
              )}

              {/* ── Filtros ──────────────────────────────────────────────── */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mr-1">
                  <MdOutlineFilterList className="text-base" /> Filtrar:
                </span>
                <button
                  onClick={() => setFiltroColor('')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    filtroColor === '' ? 'bg-techo-primary text-white border-techo-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-techo-primary'
                  }`}
                >
                  Todos
                </button>
                {Object.entries(COLORES).map(([clave, info]) => (
                  <button
                    key={clave}
                    onClick={() => setFiltroColor(clave)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      filtroColor === clave ? `${info.bg} ${info.texto} ${info.borde}` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${info.dot}`} />
                    {info.label}
                  </button>
                ))}
                <button
                  onClick={cargarCuadrillas}
                  className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs text-gray-600 transition border border-gray-100"
                >
                  <MdRefresh /> Actualizar
                </button>
              </div>

              {/* ── Lista de cuadrillas ───────────────────────────────────── */}
              {cargando ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                  <div className="w-10 h-10 border-2 border-techo-secondary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Cargando cuadrillas...</span>
                </div>
              ) : cuadrillasVisibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <MdGroups className="text-6xl mb-3 opacity-20" />
                  <p className="text-sm font-medium text-gray-500">
                    {filtroColor ? `No hay cuadrillas con estado "${COLORES[filtroColor]?.label}"` : 'No hay cuadrillas en esta emergencia'}
                  </p>
                  {esCoordinador && !filtroColor && (
                    <button
                      onClick={() => setMostrarFormCuadrilla(true)}
                      className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-techo-primary text-white rounded-xl text-sm font-semibold hover:bg-techo-primaryDark transition"
                    >
                      <MdAdd /> Crear primera cuadrilla
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cuadrillasVisibles.map((c, idx) => {
                    const ci = colorInfo(c.estadoColor);
                    const jefe = nombreJefe(c.jefe_id);
                    const obra = c.obra_asignada_id ? nombreObra(c.obra_asignada_id) : null;
                    return (
                      <div
                        key={c.id}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        className={`animate-fadeInUp bg-white rounded-2xl border-l-4 ${ci.borde} shadow-sm flex flex-col gap-0 overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}
                      >
                        {/* Encabezado tarjeta */}
                        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${ci.dot}`} />
                            <h2 className="font-bold text-gray-800 text-base truncate">{c.nombre}</h2>
                          </div>
                          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${ci.bg} ${ci.texto}`}>
                            {ci.label}
                          </span>
                        </div>

                        {/* Jefe y obra */}
                        <div className="px-4 pb-3 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <FaHardHat className="text-techo-accent flex-shrink-0" />
                            <span>Jefe: <strong className="text-gray-700">{jefe}</strong></span>
                          </div>
                          {obra && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <MdLocationOn className="text-techo-secondary flex-shrink-0" />
                              <span className="truncate">Obra: <strong className="text-gray-700">{obra}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Info rápida */}
                        <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MdPeople className="text-techo-primary text-sm" />
                            <span><strong className="text-gray-700">{c.miembrosCount ?? '?'}</strong> miembros</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MdSchedule className="text-techo-primary text-sm" />
                            <span><strong className="text-gray-700">{c.plazo_dias}</strong> días</span>
                          </div>
                          {c.fase && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MdConstruction className="text-techo-primary text-sm" />
                              <span>Fase: <strong className="text-gray-700 capitalize">{c.fase}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Progreso de fase */}
                        {c.fase && (
                          <div className="px-4 py-3 border-t border-gray-100">
                            <ProgresoFase fase={c.fase} />
                          </div>
                        )}

                        {/* Alertas */}
                        {c.alerta_emergencia && (
                          <div className="mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                            <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />
                            <span><strong>Alerta:</strong> {c.descripcion_emergencia}</span>
                          </div>
                        )}
                        {c.alerta_herramienta && (
                          <div className="mx-4 mb-2 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700">
                            <FaWrench className="flex-shrink-0 mt-0.5" />
                            <span><strong>Herramientas:</strong> {c.descripcion_alerta_herramienta}</span>
                          </div>
                        )}

                        {/* Botones de acción */}
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                          {esCoordinador && c.estado !== 'completada' && (
                            <>
                              <BtnAccion icono={<MdPersonAdd />} label="Miembros" onClick={() => abrirPanel(c, 'miembros')} color="blue" />
                              <BtnAccion icono={<MdAssignment />} label="Asignar obra" onClick={() => abrirPanel(c, 'obra')} color="indigo" />
                              <BtnAccion icono={<MdSwapHoriz />} label="Reasignar" onClick={() => abrirPanel(c, 'reasignar')} color="purple" />
                              <BtnAccion icono={<MdDone />} label="Completar" onClick={() => handleCompletarCuadrilla(c.id)} color="green" />
                            </>
                          )}
                          {esJefe && c.jefe_id === usuario?.id && c.estado !== 'completada' && (
                            <>
                              <BtnAccion icono={<MdBuild />} label="Fase" onClick={() => abrirPanel(c, 'fase')} color="teal" />
                              <BtnAccion icono={<MdWarning />} label="Alerta" onClick={() => abrirPanel(c, 'alerta')} color="red" />
                              <BtnAccion icono={<FaWrench />} label="Herramientas" onClick={() => abrirPanel(c, 'herramientas')} color="orange" />
                            </>
                          )}
                          {(esCoordinador || (esJefe && c.jefe_id === usuario?.id)) && (
                            <BtnAccion icono={<MdInfo />} label="Balance" onClick={() => { setCuadrillaActiva(c); handleVerBalance(); }} color="gray" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modal: nueva cuadrilla ─────────────────────────────────────────── */}
      {mostrarFormCuadrilla && (
        <Modal
          titulo="Nueva cuadrilla"
          subtitulo="Completa los datos para crear un nuevo equipo de trabajo"
          icono={<MdGroups className="text-techo-secondary text-xl" />}
          onCerrar={() => setMostrarFormCuadrilla(false)}
        >
          <form onSubmit={handleCrearCuadrilla} className="flex flex-col gap-4">
            <Campo label="Nombre de la cuadrilla" ayuda="Usa un nombre descriptivo que identifique la zona o trabajo">
              <input
                required
                className={estiloInput}
                placeholder="Ej: Cuadrilla Norte A"
                value={formCuadrilla.nombre}
                onChange={(e) => setFormCuadrilla({ ...formCuadrilla, nombre: e.target.value })}
              />
            </Campo>
            <Campo label="Jefe de cuadrilla" ayuda="Solo jefes activos pueden liderar una cuadrilla">
              <select
                required
                className={estiloInput}
                value={formCuadrilla.jefe_id}
                onChange={(e) => setFormCuadrilla({ ...formCuadrilla, jefe_id: e.target.value })}
              >
                <option value="">— Selecciona jefe —</option>
                {usuarios.filter((u) => u.rol === 'jefe_cuadrilla' && u.activo).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} · {u.rut}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Plazo de entrega" ayuda="Los voluntarios se agregan después de crear la cuadrilla (10–11 integrantes)">
              <div className="grid grid-cols-2 gap-2">
                {[2, 5].map((dias) => (
                  <label
                    key={dias}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition ${
                      formCuadrilla.plazo_dias === dias
                        ? 'border-techo-primary bg-blue-50 text-techo-primary'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      value={dias}
                      checked={formCuadrilla.plazo_dias === dias}
                      onChange={() => setFormCuadrilla({ ...formCuadrilla, plazo_dias: dias })}
                    />
                    <MdSchedule />
                    {dias} días {dias === 2 ? '(menor)' : '(mayor)'}
                  </label>
                ))}
              </div>
            </Campo>
            <button type="submit" className="w-full py-2.5 bg-techo-primary hover:bg-techo-primaryDark text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
              <MdAdd /> Crear cuadrilla
            </button>
          </form>
        </Modal>
      )}

      {/* ── Paneles de acción ─────────────────────────────────────────────── */}
      {panel && cuadrillaActiva && (
        <Modal titulo={tituloPanel(panel, cuadrillaActiva)} onCerrar={cerrarPanel}>

          {/* Miembros */}
          {panel === 'miembros' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
                <MdPeople />
                <span>La cuadrilla necesita entre <strong>10 y 11 integrantes</strong>. Actualmente tiene <strong>{cuadrillaActiva.miembrosCount ?? 0}</strong>.</span>
              </div>
              <form onSubmit={handleAgregarMiembro} className="flex flex-col gap-3">
                <Campo label="Voluntario a agregar">
                  <select required className={estiloInput} value={voluntarioId} onChange={(e) => setVoluntarioId(e.target.value)}>
                    <option value="">— Selecciona voluntario —</option>
                    {usuarios.filter((u) => u.rol === 'voluntario' && u.activo).map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre} · {u.rut}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Habilidades (opcional)">
                  <input className={estiloInput} placeholder="Ej: carpintería, primeros auxilios" value={habilidades} onChange={(e) => setHabilidades(e.target.value)} />
                </Campo>
                <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold">
                  <MdPersonAdd /> Agregar miembro
                </button>
              </form>
            </div>
          )}

          {/* Asignar obra */}
          {panel === 'obra' && (
            <form onSubmit={handleAsignarObra} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 text-xs text-indigo-700">
                <MdAssignment />
                Al asignar, todos los integrantes recibirán notificación con la ubicación y el plazo.
              </div>
              <Campo label="Obra disponible">
                <select required className={estiloInput} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                  <option value="">— Selecciona obra —</option>
                  {obras.filter((o) => o.estado === 'disponible').map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre}{o.direccion ? ` — ${o.direccion}` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
              <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-semibold">
                <MdAssignment /> Asignar obra
              </button>
            </form>
          )}

          {/* Actualizar fase */}
          {panel === 'fase' && (
            <form onSubmit={handleActualizarFase} className="flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3">Selecciona la fase actual del trabajo en terreno</p>
                <div className="flex flex-col gap-2">
                  {FASES.map((f, i) => (
                    <label
                      key={f}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                        faseSeleccionada === f
                          ? 'border-techo-primary bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input type="radio" className="sr-only" value={f} checked={faseSeleccionada === f} onChange={() => setFaseSeleccionada(f)} />
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        faseSeleccionada === f ? 'bg-techo-primary text-white' : 'bg-gray-200 text-gray-500'
                      }`}>{i + 1}</div>
                      <div>
                        <p className={`text-sm font-semibold capitalize ${faseSeleccionada === f ? 'text-techo-primary' : 'text-gray-700'}`}>{f}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={!faseSeleccionada} className="flex items-center justify-center gap-2 py-2.5 bg-techo-primary text-white rounded-xl hover:bg-techo-primaryDark transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                <MdBuild /> Actualizar fase
              </button>
            </form>
          )}

          {/* Alerta de emergencia */}
          {panel === 'alerta' && (
            <form onSubmit={handleEnviarAlerta} className="flex flex-col gap-4">
              <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-xl px-3 py-3 text-sm text-red-700">
                <MdWarning className="text-lg flex-shrink-0 mt-0.5" />
                <p>Esta alerta llega <strong>inmediatamente</strong> al coordinador con la ubicación de la cuadrilla. Úsala solo en situaciones que requieran intervención urgente.</p>
              </div>
              <Campo label="Descripción del incidente">
                <textarea
                  required
                  rows={4}
                  className={estiloInput}
                  placeholder="Describe con detalle qué está ocurriendo en terreno..."
                  value={descripcionAlerta}
                  onChange={(e) => setDescripcionAlerta(e.target.value)}
                />
              </Campo>
              <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold">
                <FaExclamationTriangle /> Enviar alerta de emergencia
              </button>
            </form>
          )}

          {/* Reasignar voluntario */}
          {panel === 'reasignar' && (
            <form onSubmit={handleReasignar} className="flex flex-col gap-4">
              <Campo label="Voluntario a reasignar">
                <select required className={estiloInput} value={voluntarioReasignarId} onChange={(e) => setVoluntarioReasignarId(e.target.value)}>
                  <option value="">— Selecciona voluntario —</option>
                  {usuarios.filter((u) => u.rol === 'voluntario' && u.activo).map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </Campo>
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <span className="font-medium text-gray-600 text-xs">{cuadrillaActiva.nombre}</span>
                <MdArrowForward />
                <span className="text-xs text-gray-500">cuadrilla destino</span>
              </div>
              <Campo label="Cuadrilla destino">
                <select required className={estiloInput} value={cuadrillaDestinoId} onChange={(e) => setCuadrillaDestinoId(e.target.value)}>
                  <option value="">— Selecciona cuadrilla —</option>
                  {cuadrillas.filter((c) => c.id !== cuadrillaActiva.id && c.estado !== 'completada').map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </Campo>
              <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-semibold">
                <MdSwapHoriz /> Reasignar voluntario
              </button>
            </form>
          )}

          {/* Herramientas */}
          {panel === 'herramientas' && (
            <div className="flex flex-col gap-4">
              {/* Tabs individual/masivo */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {['individual', 'masivo'].map((modo) => (
                  <button
                    key={modo}
                    onClick={() => setModoReg(modo)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                      modoReg === modo ? 'bg-techo-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {modo}
                  </button>
                ))}
              </div>

              {/* Registro individual */}
              {modoReg === 'individual' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nombreHerramientaIndividual}
                    onChange={(e) => setNombreHerramientaIndividual(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegistrarIndividual()}
                    placeholder="Nombre de la herramienta"
                    className={estiloInput}
                  />
                  <button
                    onClick={handleRegistrarIndividual}
                    className="px-4 py-2 bg-techo-success text-white text-sm font-bold rounded-xl hover:bg-green-700 transition"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Registro masivo */}
              {modoReg === 'masivo' && (
                <form onSubmit={handleRegistrarHerramientas} className="flex flex-col gap-2">
                  <textarea
                    rows={3}
                    className={estiloInput}
                    placeholder={"Martillo\nEspátula\nCasco de seguridad"}
                    value={nombresHerramientas}
                    onChange={(e) => setNombresHerramientas(e.target.value)}
                  />
                  <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-techo-accent text-white rounded-xl hover:bg-orange-600 transition text-sm font-semibold">
                    <FaWrench /> Registrar todas
                  </button>
                </form>
              )}

              {/* Lista de herramientas con cards coloreadas */}
              {herramientas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500">
                      Herramientas registradas <span className="text-techo-primary font-bold">({herramientas.length})</span>
                    </p>
                    <select
                      value={filtroHerr}
                      onChange={(e) => setFiltroHerr(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-techo-secondary"
                    >
                      <option value="todos">Todos</option>
                      {Object.entries(ESTILOS_HERR).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {herramientas
                      .filter((h) => filtroHerr === 'todos' || h.estado === filtroHerr)
                      .map((h) => {
                        const est = ESTILOS_HERR[h.estado] || ESTILOS_HERR.entregada;
                        return (
                          <div key={h.id} className={`border-l-4 ${est.borde} bg-gray-50 rounded-r-xl px-3 py-2 flex items-center justify-between gap-2`}>
                            <span className="font-medium text-gray-700 text-sm truncate">{h.nombre}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${est.badge}`}>{est.label}</span>
                              <select
                                value={h.estado}
                                onChange={(e) => handleCambiarEstadoHerramienta(h.id, e.target.value)}
                                className="border border-gray-200 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none"
                              >
                                {Object.entries(ESTILOS_HERR).map(([val, { label }]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <button
                onClick={handleCerrarBalance}
                className="flex items-center justify-center gap-2 py-2.5 bg-techo-primary text-white rounded-xl hover:bg-techo-primaryDark transition text-sm font-semibold"
              >
                <MdDone /> Cerrar balance del día
              </button>
            </div>
          )}

          {/* Balance */}
          {panel === 'balance' && balance && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2.5">
                <FilaBalance label="Total" valor={balance.total} color="gray" />
                <FilaBalance label="Entregadas" valor={balance.entregadas} color="blue" />
                <FilaBalance label="Buenas" valor={balance.buenas} color="green" />
                <FilaBalance label="Dañadas" valor={balance.danadas} color="yellow" />
                <FilaBalance label="Perdidas" valor={balance.perdidas} color="red" />
                <FilaBalance label="No devueltas" valor={balance.noDevueltas} color="orange" />
              </div>
              {balance.conDiferencias ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">
                  <MdWarning /> Hay diferencias. El coordinador fue notificado automáticamente.
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-700">
                  <MdCheckCircle /> Todo en orden. Sin diferencias en el inventario.
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function ProgresoFase({ fase }) {
  const fases = ['limpieza', 'montaje', 'terminaciones'];
  const idx = fases.indexOf(fase);
  return (
    <div className="flex items-center">
      {fases.map((f, i) => (
        <Fragment key={f}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
              i <= idx ? 'bg-techo-primary text-white' : 'bg-gray-200 text-gray-400'
            }`}>
              {i + 1}
            </div>
            <span className={`text-[10px] capitalize whitespace-nowrap ${i <= idx ? 'text-techo-primary font-semibold' : 'text-gray-400'}`}>
              {f}
            </span>
          </div>
          {i < 2 && (
            <div className={`flex-1 h-0.5 mb-3.5 ${i < idx ? 'bg-techo-primary' : 'bg-gray-200'}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

function StatCard({ valor, etiqueta, icono, colorClase, bgClase }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bgClase} flex items-center justify-center text-xl ${colorClase}`}>
        {icono}
      </div>
      <div>
        <p className={`text-2xl font-bold ${colorClase}`}>{valor}</p>
        <p className="text-xs text-gray-400">{etiqueta}</p>
      </div>
    </div>
  );
}

function Modal({ titulo, subtitulo, icono, onCerrar, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {icono}
            <div>
              <h2 className="font-bold text-gray-800 text-sm leading-tight">{titulo}</h2>
              {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
            </div>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 transition ml-2 flex-shrink-0">
            <MdClose className="text-xl" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Campo({ label, ayuda, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
      {ayuda && <p className="text-xs text-gray-400 mt-1">{ayuda}</p>}
    </div>
  );
}

function BtnAccion({ icono, label, onClick, color }) {
  const colores = {
    blue:   'bg-blue-50   text-blue-700   border-blue-200   hover:bg-blue-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    green:  'bg-green-50  text-green-700  border-green-200  hover:bg-green-100',
    teal:   'bg-teal-50   text-teal-700   border-teal-200   hover:bg-teal-100',
    red:    'bg-red-50    text-red-700    border-red-200    hover:bg-red-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    gray:   'bg-gray-50   text-gray-600   border-gray-200   hover:bg-gray-100',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${colores[color] || colores.gray}`}
    >
      {icono} {label}
    </button>
  );
}

function FilaBalance({ label, valor, color }) {
  const c = {
    gray:   'bg-gray-100   text-gray-700',
    blue:   'bg-blue-100   text-blue-700',
    green:  'bg-green-100  text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red:    'bg-red-100    text-red-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <div className={`rounded-xl p-3 flex justify-between items-center ${c[color] || c.gray}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-lg font-bold">{valor ?? 0}</span>
    </div>
  );
}

const tituloPanel = (panel, cuadrilla) => {
  const titulos = {
    miembros:     `Miembros — ${cuadrilla.nombre}`,
    obra:         `Asignar obra — ${cuadrilla.nombre}`,
    fase:         `Actualizar fase — ${cuadrilla.nombre}`,
    alerta:       `Alerta de emergencia — ${cuadrilla.nombre}`,
    reasignar:    `Reasignar voluntario — ${cuadrilla.nombre}`,
    herramientas: `Herramientas — ${cuadrilla.nombre}`,
    balance:      `Balance del día — ${cuadrilla.nombre}`,
  };
  return titulos[panel] || cuadrilla.nombre;
};

const estadoHerramientaActivo = (estado) => {
  const m = {
    buena:      'bg-green-100  text-green-700  border-green-400',
    danada:     'bg-yellow-100 text-yellow-700 border-yellow-400',
    perdida:    'bg-red-100    text-red-700    border-red-400',
    no_devuelta:'bg-orange-100 text-orange-700 border-orange-400',
  };
  return m[estado] || '';
};

const etiquetaEstado = (estado) => {
  const m = { buena: 'Buena', danada: 'Dañada', perdida: 'Perdida', no_devuelta: 'No dev.' };
  return m[estado] || estado;
};

const estiloInput = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary';

export default GestionCuadrillas;
