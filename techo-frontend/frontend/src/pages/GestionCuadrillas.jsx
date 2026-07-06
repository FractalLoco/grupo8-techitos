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
  listarTodasLasCuadrillasConEstado,
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
  verde:    { bg: 'bg-secondary/10',  borde: 'border-secondary',  texto: 'text-secondary',  dot: 'bg-secondary/50',  label: 'En plazo' },
  amarillo: { bg: 'bg-tertiary/10', borde: 'border-tertiary', texto: 'text-tertiary', dot: 'bg-tertiary/50', label: 'Riesgo de retraso' },
  rojo:     { bg: 'bg-error-container',    borde: 'border-error',    texto: 'text-on-error-container',    dot: 'bg-error-container/400',    label: 'Requiere intervención' },
  azul:     { bg: 'bg-primary/10',   borde: 'border-primary',   texto: 'text-primary',   dot: 'bg-primary/50',   label: 'Sin obra asignada' },
  gris:     { bg: 'bg-surface-container',   borde: 'border-outline',   texto: 'text-on-surface-variant',   dot: 'bg-outline',   label: 'Completada' },
};

const FASES = ['limpieza', 'montaje', 'terminaciones'];

const ESTILOS_HERR = {
  entregada:   { borde: 'border-primary',  badge: 'bg-primary/10 text-primary',     label: 'Entregada' },
  buena:       { borde: 'border-secondary', badge: 'bg-secondary/10 text-secondary',   label: 'Buena' },
  danada:      { borde: 'border-tertiary', badge: 'bg-tertiary/10 text-tertiary', label: 'Dañada' },
  perdida:     { borde: 'border-error', badge: 'bg-error-container text-on-error-container',       label: 'Perdida' },
  no_devuelta: { borde: 'border-tertiary',      badge: 'bg-tertiary/10 text-tertiary', label: 'No devuelta' },
};

const TABS = [
  { key: 'personal',     label: 'Personal',         icon: <MdPeople /> },
  { key: 'obra',         label: 'Obra & Fase',       icon: <MdAssignment /> },
  { key: 'herramientas', label: 'Herramientas',      icon: <FaWrench /> },
  { key: 'alertas',      label: 'Alertas & Balance', icon: <MdWarning /> },
];

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
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [tabActivo, setTabActivo] = useState('personal');
  const [herramientasCache, setHerramientasCache] = useState(new Map());
  const [mostrarReasignar, setMostrarReasignar] = useState(false);

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
    setCargando(true);
    try {
      let lista = [];
      if (emergenciaId) {
        const data = await listarCuadrillasConEstado(emergenciaId, filtroColor || null);
        lista = data?.datos?.cuadrillas || [];
        if (esCoordinador) {
          const dataObras = await listarObrasPorEmergencia(emergenciaId);
          const listaObras = dataObras?.datos?.obras || dataObras?.datos || [];
          setObras(Array.isArray(listaObras) ? listaObras : []);
        }
      } else {
        const data = await listarTodasLasCuadrillasConEstado(filtroColor || null);
        lista = data?.datos?.cuadrillas || [];
        setObras([]);
      }
      setCuadrillas(lista);
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
  const cuadrillasConAlerta = cuadrillasVisibles.filter((c) => c.alerta_emergencia || c.alerta_herramienta).length;

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const cargarHerramientas = async (cuadrillaId) => {
    try {
      const data = await listarHerramientas(cuadrillaId);
      const lista = data?.datos?.herramientas || data?.datos || [];
      const resultado = Array.isArray(lista) ? lista : [];
      setHerramientas(resultado);
      setHerramientasCache((prev) => {
        const m = new Map(prev);
        m.set(cuadrillaId, resultado.length);
        return m;
      });
    } catch {
      mostrarMensaje('error', 'Error al cargar herramientas');
    }
  };

  const abrirGestionar = (cuadrilla, tabInicial = 'personal') => {
    setCuadrillaActiva(cuadrilla);
    setTabActivo(tabInicial);
    setDrawerAbierto(true);
    setBalance(null);
    setHerramientas([]);
    setMostrarReasignar(false);
    cargarHerramientas(cuadrilla.id);
  };

  const cerrarGestionar = () => {
    setDrawerAbierto(false);
    setCuadrillaActiva(null);
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
      cerrarGestionar();
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
      setMostrarReasignar(false);
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
      cerrarGestionar();
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
      cerrarGestionar();
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
      setTabActivo('alertas');
    } catch (err) {
      mostrarMensaje('error', err.response?.data?.mensaje || err.message);
    }
  };

  const colorInfo = (c) => COLORES[c] || COLORES.gris;
  const nombreJefe = (jefe_id) => { const u = usuarios.find((u) => u.id === jefe_id); return u ? u.nombre : '—'; };
  const nombreObra = (obra_id) => { const o = obras.find((o) => o.id === obra_id); return o ? o.nombre : null; };

  const getPrimaryAction = (c) => {
    if (c.estado === 'completada' || c.estado === 'desarmada') return null;

    if (esCoordinador) {
      if ((c.miembrosCount ?? 0) < 10)
        return {
          label: `Agregar miembros (${c.miembrosCount ?? 0}/10 mín.)`,
          icon: <MdPersonAdd />,
          color: 'bg-primary hover:bg-primary/90 text-white',
          onClick: () => abrirGestionar(c, 'personal'),
        };
      if (!c.obra_asignada_id && emergenciaId)
        return {
          label: 'Asignar obra',
          icon: <MdAssignment />,
          color: 'bg-primary hover:bg-primary-dark text-white',
          onClick: () => abrirGestionar(c, 'obra'),
        };
      if (c.fase === 'terminaciones' || c.estado === 'en_progreso')
        return {
          label: 'Marcar completada',
          icon: <MdDone />,
          color: 'bg-secondary hover:bg-secondary/90 text-white',
          onClick: () => handleCompletarCuadrilla(c.id),
        };
      return {
        label: 'En progreso',
        icon: <MdConstruction />,
        color: 'bg-surface-container text-outline cursor-default',
        onClick: () => {},
      };
    }

    if (esJefe && c.jefe_id === usuario?.id) {
      if (!c.obra_asignada_id)
        return {
          label: 'Esperando obra',
          icon: <MdSchedule />,
          color: 'bg-surface-container text-outline cursor-default',
          onClick: () => {},
        };
      if (!c.fase)
        return {
          label: 'Iniciar — elegir fase',
          icon: <MdBuild />,
          color: 'bg-secondary hover:bg-secondary/90 text-white',
          onClick: () => abrirGestionar(c, 'obra'),
        };
      if (c.fase !== 'terminaciones')
        return {
          label: `Avanzar desde ${c.fase}`,
          icon: <MdArrowForward />,
          color: 'bg-secondary hover:bg-secondary/90 text-white',
          onClick: () => abrirGestionar(c, 'obra'),
        };
      return {
        label: 'Cerrar balance del día',
        icon: <MdDone />,
        color: 'bg-primary hover:bg-primary-dark text-white',
        onClick: () => abrirGestionar(c, 'alertas'),
      };
    }

    return null;
  };

  const tabsVisibles = (cuadrilla) => {
    if (!cuadrilla) return TABS;
    const puedePersonal = esCoordinador || (esJefe && cuadrilla.jefe_id === usuario?.id);
    const puedeHerr = esCoordinador || (esJefe && cuadrilla.jefe_id === usuario?.id);
    return TABS.filter((t) => {
      if (t.key === 'personal' && !puedePersonal) return false;
      if (t.key === 'herramientas' && !puedeHerr) return false;
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-[60px]">
        {/* Header */}
        <div className="bg-primary shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-1">
              <MdGroups className="text-white/80 text-2xl flex-shrink-0" />
              <h1 className="text-white font-bold text-lg tracking-tight">Gestión de Cuadrillas</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
              <select
                className="bg-white/10 text-white border border-white/25 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 min-w-[190px]"
                value={emergenciaId}
                onChange={(e) => { setEmergenciaId(e.target.value); setFiltroColor(''); }}
              >
                <option value="" className="text-on-surface bg-white">— Selecciona emergencia —</option>
                {emergencias.map((em) => (
                  <option key={em.id} value={em.id} className="text-on-surface bg-white">{em.nombre}</option>
                ))}
              </select>
            </div>
            {esCoordinador && (
              <button
                onClick={() => {
                  if (!emergenciaId) { mostrarMensaje('error', 'Selecciona una emergencia primero'); return; }
                  setMostrarFormCuadrilla(true);
                }}
                title={!emergenciaId ? 'Selecciona una emergencia primero' : 'Crear nueva cuadrilla'}
                className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm border ${
                  emergenciaId ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' : 'bg-white/10 text-white/40 border-white/15 cursor-not-allowed'
                }`}
              >
                <MdAdd className="text-base" /> Nueva cuadrilla
              </button>
            )}
          </div>
        </div>

        {/* Toast */}
        {mensaje && (
          <div className={`fixed top-[122px] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold animate-fadeIn ${
            mensaje.tipo === 'exito' ? 'bg-secondary text-white' : 'bg-error text-white'
          }`}>
            {mensaje.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
            {mensaje.texto}
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-5">
          <>
            {!emergenciaId && cuadrillasVisibles.length > 0 && (
              <div className="mb-4 flex items-center gap-2 bg-primary/5 border border-primary/30 rounded-xl px-4 py-2.5 text-xs text-primary font-medium">
                <MdInfo className="text-base flex-shrink-0" />
                Vista global — mostrando todas las cuadrillas del sistema. Selecciona una emergencia para crear o asignar obras.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <StatCard valor={stats.total}        etiqueta="Total equipos"  icono={<MdGroups />}      colorClase="text-primary"  bgClase="bg-primary-fixed" />
              <StatCard valor={stats.activas}      etiqueta="Activas"        icono={<MdPeople />}      colorClase="text-primary"  bgClase="bg-primary-fixed/40" />
              <StatCard valor={stats.en_progreso}  etiqueta="En marcha"      icono={<MdConstruction />} colorClase="text-tertiary" bgClase="bg-tertiary-fixed" />
              <StatCard valor={cuadrillasConAlerta} etiqueta="Con alertas"   icono={<MdWarning />}     colorClase="text-error"  bgClase="bg-error-container" />
            </div>

            <div className="bg-white rounded-xl border border-outline-variant px-4 py-3 mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
                <MdOutlineFilterList className="text-base text-primary" /> Filtrar:
              </span>
              <button
                onClick={() => setFiltroColor('')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  filtroColor === '' ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline-variant hover:border-primary'
                }`}
              >
                Todos
              </button>
              {Object.entries(COLORES).map(([clave, info]) => (
                <button
                  key={clave}
                  onClick={() => setFiltroColor(clave)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    filtroColor === clave ? `${info.bg} ${info.texto} ${info.borde}` : 'bg-white text-on-surface-variant border-outline-variant hover:border-outline'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${info.dot}`} />
                  {info.label}
                </button>
              ))}
              <button
                onClick={cargarCuadrillas}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-surface-container hover:bg-surface-container-highest rounded-xl text-xs text-on-surface-variant transition border border-outline-variant"
              >
                <MdRefresh /> Actualizar
              </button>
            </div>

            {cargando ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-outline">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando cuadrillas...</span>
              </div>
            ) : cuadrillasVisibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-outline">
                <MdGroups className="text-6xl mb-3 opacity-20" />
                <p className="text-sm font-medium text-on-surface-variant">
                  {filtroColor
                    ? `No hay cuadrillas con estado "${COLORES[filtroColor]?.label}"`
                    : emergenciaId ? 'No hay cuadrillas en esta emergencia' : 'No hay cuadrillas registradas en el sistema'}
                </p>
                {esCoordinador && !filtroColor && emergenciaId && (
                  <button
                    onClick={() => setMostrarFormCuadrilla(true)}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition"
                  >
                    <MdAdd /> Crear primera cuadrilla
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="text-sm font-bold text-on-surface">Cuadrillas activas</h2>
                  {cuadrillasConAlerta > 0 && (
                    <span className="ml-2 flex items-center gap-1 text-[10px] font-bold text-white bg-error px-2 py-0.5 rounded-full">
                      <FaExclamationTriangle className="text-[8px]" /> {cuadrillasConAlerta} alerta{cuadrillasConAlerta > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cuadrillasVisibles.map((c, idx) => {
                  const ci = colorInfo(c.estadoColor);
                  const jefe = nombreJefe(c.jefe_id);
                  const obra = c.obra_asignada_id ? nombreObra(c.obra_asignada_id) : null;
                  const cta = getPrimaryAction(c);
                  const herrCount = herramientasCache.get(c.id);
                  const puedeGestionar =
                    c.estado !== 'completada' && c.estado !== 'desarmada' &&
                    (esCoordinador || (esJefe && c.jefe_id === usuario?.id));
                  const puedeBalance = esCoordinador || (esJefe && c.jefe_id === usuario?.id);

                  return (
                    <div
                      key={c.id}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className={`animate-fadeInUp bg-white rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}
                    >
                      {/* Franja de color por estado */}
                      <div className={`h-1 flex-shrink-0 ${
                        c.estadoColor === 'verde' ? 'bg-secondary' :
                        c.estadoColor === 'amarillo' ? 'bg-tertiary-container' :
                        c.estadoColor === 'rojo' ? 'bg-error' :
                        c.estadoColor === 'azul' ? 'bg-primary' :
                        'bg-outline'
                      }`} />

                      {/* Header con avatar */}
                      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0 uppercase">
                            {c.nombre.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-bold text-on-surface text-sm truncate">{c.nombre}</h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <FaHardHat className="text-tertiary text-[10px] flex-shrink-0" />
                              <span className="text-xs text-on-surface-variant truncate">{jefe}</span>
                            </div>
                            {obra && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <MdLocationOn className="text-primary text-xs flex-shrink-0" />
                                <span className="text-xs text-on-surface-variant truncate">{obra}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${ci.bg} ${ci.texto}`}>
                          {ci.label}
                        </span>
                      </div>

                      {/* Meta info con barra de miembros */}
                      <div className="px-4 py-2 border-t border-surface-container flex flex-wrap gap-x-4 gap-y-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <MdPeople className="text-primary text-sm" />
                            <span>
                              <strong className={(c.miembrosCount ?? 0) < 10 ? 'text-tertiary' : 'text-on-surface'}>
                                {c.miembrosCount ?? '?'}
                              </strong>
                              <span className="text-outline">/11</span>
                            </span>
                          </div>
                          <div className="w-28 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(c.miembrosCount ?? 0) >= 10 ? 'bg-secondary' : (c.miembrosCount ?? 0) >= 6 ? 'bg-tertiary-container' : 'bg-error'}`}
                              style={{ width: `${Math.min(((c.miembrosCount ?? 0) / 11) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        {herrCount !== undefined && (
                          <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <FaWrench className="text-tertiary text-[11px]" />
                            <span><strong className="text-on-surface">{herrCount}</strong> herr.</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <MdSchedule className="text-primary text-sm" />
                          <span><strong className="text-on-surface">{c.plazo_dias}</strong>d</span>
                        </div>
                        {c.fase && (
                          <span className={`self-center px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            c.fase === 'terminaciones' ? 'bg-secondary-container/30 text-secondary' :
                            c.fase === 'montaje' ? 'bg-primary-fixed text-primary' :
                            'bg-surface-container text-on-surface-variant'
                          }`}>
                            {c.fase}
                          </span>
                        )}
                      </div>

                      {c.fase && (
                        <div className="px-4 py-3 border-t border-surface-container">
                          <ProgresoFase fase={c.fase} />
                        </div>
                      )}

                      {c.alerta_emergencia && (
                        <div className="mx-4 mb-2 flex items-start gap-2 bg-error-container border border-error/30 rounded-xl px-3 py-2 text-xs text-error">
                          <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />
                          <span><strong>Alerta:</strong> {c.descripcion_emergencia}</span>
                        </div>
                      )}
                      {c.alerta_herramienta && (
                        <div className="mx-4 mb-2 flex items-start gap-2 bg-tertiary-fixed/50 border border-tertiary/30 rounded-xl px-3 py-2 text-xs text-tertiary">
                          <FaWrench className="flex-shrink-0 mt-0.5" />
                          <span><strong>Herramientas:</strong> {c.descripcion_alerta_herramienta}</span>
                        </div>
                      )}

                      {/* Barra de acciones con divisor */}
                      <div className="border-t border-surface-container flex divide-x divide-surface-container mt-auto">
                        {cta && (
                          <button
                            onClick={cta.onClick}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${cta.color}`}
                          >
                            {cta.icon} {cta.label}
                          </button>
                        )}
                        {puedeGestionar && (
                          <button
                            onClick={() => abrirGestionar(c)}
                            className="flex items-center gap-1.5 px-4 py-3 text-primary text-xs font-semibold hover:bg-surface-container transition flex-shrink-0"
                          >
                            <MdBuild className="text-sm" /> Gestionar
                          </button>
                        )}
                        {puedeBalance && (
                          <button
                            onClick={() => {
                              setCuadrillaActiva(c);
                              setDrawerAbierto(true);
                              setTabActivo('alertas');
                              setBalance(null);
                              setHerramientas([]);
                              cargarHerramientas(c.id);
                            }}
                            className="px-3 py-3 text-outline hover:text-primary hover:bg-surface-container transition flex-shrink-0"
                            title="Ver balance"
                          >
                            <MdInfo className="text-base" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </>
        </div>
      </div>

      {/* FAB: nueva cuadrilla (solo coordinador, se oculta cuando el modal está abierto) */}
      {esCoordinador && !mostrarFormCuadrilla && !drawerAbierto && (
        <button
          onClick={() => {
            if (!emergenciaId) { mostrarMensaje('error', 'Selecciona una emergencia primero'); return; }
            setMostrarFormCuadrilla(true);
          }}
          className="fixed bottom-6 right-6 z-[400] flex items-center gap-2.5 px-5 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm active:scale-95"
        >
          <MdAdd className="text-xl" /> Nueva cuadrilla
        </button>
      )}

      {/* Modal: nueva cuadrilla */}
      {mostrarFormCuadrilla && (
        <Modal
          titulo="Nueva cuadrilla"
          subtitulo="Completa los datos para crear un nuevo equipo de trabajo"
          icono={<MdGroups className="text-primary text-xl" />}
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
                        ? 'border-primary bg-primary-fixed/40 text-primary'
                        : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
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
            <button type="submit" className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
              <MdAdd /> Crear cuadrilla
            </button>
          </form>
        </Modal>
      )}

      {/* Drawer de gestión */}
      {drawerAbierto && cuadrillaActiva && (
        <div className="fixed inset-0 z-[500] flex">
          <div className="flex-1 bg-black/40 cursor-pointer" onClick={cerrarGestionar} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col" style={{ height: '100vh' }}>

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 bg-primary flex-shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] text-white/50 uppercase tracking-widest">Cuadrilla</p>
                <h2 className="font-bold text-white text-base leading-tight truncate">{cuadrillaActiva.nombre}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${colorInfo(cuadrillaActiva.estadoColor)?.dot || 'bg-outline'}`} />
                  <span className="text-xs text-white/70">{colorInfo(cuadrillaActiva.estadoColor)?.label}</span>
                </div>
              </div>
              <button onClick={cerrarGestionar} className="text-white/70 hover:text-white transition ml-3 flex-shrink-0">
                <MdClose className="text-2xl" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-outline-variant/60 bg-white flex-shrink-0 overflow-x-auto">
              {tabsVisibles(cuadrillaActiva).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTabActivo(tab.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                    tabActivo === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-outline hover:text-on-surface hover:border-outline-variant'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* Personal */}
              {tabActivo === 'personal' && (
                <div className="flex flex-col gap-5">
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border ${
                    (cuadrillaActiva.miembrosCount ?? 0) < 10
                      ? 'bg-tertiary/5 border-tertiary/30 text-tertiary'
                      : 'bg-secondary/5 border-secondary/30 text-secondary'
                  }`}>
                    <MdPeople />
                    <span>
                      <strong>{cuadrillaActiva.miembrosCount ?? 0}</strong> de 10–11 integrantes requeridos
                      {(cuadrillaActiva.miembrosCount ?? 0) < 10 && ` — faltan ${10 - (cuadrillaActiva.miembrosCount ?? 0)} para el mínimo`}
                    </span>
                  </div>

                  {esCoordinador && (
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Agregar voluntario</p>
                      <form onSubmit={handleAgregarMiembro} className="flex flex-col gap-2">
                        <select required className={estiloInput} value={voluntarioId} onChange={(e) => setVoluntarioId(e.target.value)}>
                          <option value="">— Selecciona voluntario —</option>
                          {usuarios.filter((u) => u.rol === 'voluntario' && u.activo).map((u) => (
                            <option key={u.id} value={u.id}>{u.nombre} · {u.rut}</option>
                          ))}
                        </select>
                        <input
                          className={estiloInput}
                          placeholder="Habilidades (opcional) — ej: carpintería"
                          value={habilidades}
                          onChange={(e) => setHabilidades(e.target.value)}
                        />
                        <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition text-sm font-semibold">
                          <MdPersonAdd /> Agregar a cuadrilla
                        </button>
                      </form>
                    </div>
                  )}

                  {esCoordinador && (
                    <div>
                      <button
                        onClick={() => setMostrarReasignar(!mostrarReasignar)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-tertiary hover:text-tertiary transition"
                      >
                        <MdSwapHoriz />
                        {mostrarReasignar ? 'Cancelar reasignación' : 'Reasignar voluntario a otra cuadrilla'}
                      </button>

                      {mostrarReasignar && (
                        <form onSubmit={handleReasignar} className="mt-3 flex flex-col gap-2 p-3 bg-tertiary/5 border border-tertiary/30 rounded-xl">
                          <p className="text-xs text-tertiary font-medium">
                            Mueve un voluntario desde <strong>{cuadrillaActiva.nombre}</strong> a otra cuadrilla activa.
                          </p>
                          <select required className={estiloInput} value={voluntarioReasignarId} onChange={(e) => setVoluntarioReasignarId(e.target.value)}>
                            <option value="">— Voluntario a mover —</option>
                            {usuarios.filter((u) => u.rol === 'voluntario' && u.activo).map((u) => (
                              <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2 text-outline text-xs">
                            <MdArrowForward />
                            <span>hacia</span>
                          </div>
                          <select required className={estiloInput} value={cuadrillaDestinoId} onChange={(e) => setCuadrillaDestinoId(e.target.value)}>
                            <option value="">— Cuadrilla destino —</option>
                            {cuadrillas
                              .filter((c) => c.id !== cuadrillaActiva.id && c.estado !== 'completada')
                              .map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre} ({c.miembrosCount ?? '?'}/11)</option>
                              ))}
                          </select>
                          <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-tertiary text-white rounded-xl hover:bg-tertiary/90 transition text-sm font-semibold">
                            <MdSwapHoriz /> Confirmar reasignación
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Obra & Fase */}
              {tabActivo === 'obra' && (
                <div className="flex flex-col gap-5">
                  {esCoordinador && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Asignar obra</p>
                      {cuadrillaActiva.obra_asignada_id ? (
                        <div className="flex items-center gap-2 bg-secondary/5 border border-secondary/30 rounded-xl px-3 py-2 text-xs text-secondary">
                          <MdCheckCircle /> Obra ya asignada: <strong className="ml-1">{nombreObra(cuadrillaActiva.obra_asignada_id) || '—'}</strong>
                        </div>
                      ) : (
                        <form onSubmit={handleAsignarObra} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-primary/5 border border-primary/30 rounded-xl px-3 py-2 text-xs text-primary">
                            <MdAssignment />
                            Al asignar, todos los integrantes recibirán notificación con la ubicación y el plazo.
                          </div>
                          <select required className={estiloInput} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                            <option value="">— Selecciona obra —</option>
                            {obras.filter((o) => o.estado === 'disponible').map((o) => (
                              <option key={o.id} value={o.id}>{o.nombre}{o.direccion ? ` — ${o.direccion}` : ''}</option>
                            ))}
                          </select>
                          <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition text-sm font-semibold">
                            <MdAssignment /> Asignar obra
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {esCoordinador && <hr className="border-outline-variant/60" />}

                  {esJefe && cuadrillaActiva.jefe_id === usuario?.id && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Fase del trabajo</p>
                      {!cuadrillaActiva.obra_asignada_id && (
                        <div className="bg-tertiary/5 border border-tertiary/30 rounded-xl px-3 py-2 text-xs text-tertiary">
                          No hay obra asignada aún. Espera la asignación del coordinador.
                        </div>
                      )}
                      {cuadrillaActiva.fase && (
                        <div className="py-2">
                          <ProgresoFase fase={cuadrillaActiva.fase} />
                        </div>
                      )}
                      <form onSubmit={handleActualizarFase} className="flex flex-col gap-2">
                        {FASES.map((f, i) => (
                          <label
                            key={f}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                              faseSeleccionada === f ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant hover:border-outline'
                            } ${!cuadrillaActiva.obra_asignada_id ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            <input type="radio" className="sr-only" value={f} checked={faseSeleccionada === f} onChange={() => setFaseSeleccionada(f)} />
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              faseSeleccionada === f ? 'bg-primary text-white' :
                              FASES.indexOf(cuadrillaActiva.fase ?? '') >= i ? 'bg-secondary text-white' :
                              'bg-surface-container-highest text-on-surface-variant'
                            }`}>{i + 1}</div>
                            <p className={`flex-1 text-sm font-semibold capitalize ${faseSeleccionada === f ? 'text-primary' : 'text-on-surface'}`}>{f}</p>
                            {cuadrillaActiva.fase === f && <span className="text-[10px] text-secondary font-bold">ACTUAL</span>}
                          </label>
                        ))}
                        <button
                          type="submit"
                          disabled={!faseSeleccionada || !cuadrillaActiva.obra_asignada_id}
                          className="flex items-center justify-center gap-2 py-2.5 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <MdBuild /> Actualizar fase
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Herramientas */}
              {tabActivo === 'herramientas' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">Registro rápido</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={nombreHerramientaIndividual}
                        onChange={(e) => setNombreHerramientaIndividual(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRegistrarIndividual(); } }}
                        placeholder="Nombre — Enter para agregar"
                        className={estiloInput}
                        autoFocus
                      />
                      <button
                        onClick={handleRegistrarIndividual}
                        className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-xl hover:bg-secondary/90 transition flex-shrink-0"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <details className="group">
                    <summary className="text-xs font-semibold text-on-surface-variant cursor-pointer hover:text-on-surface flex items-center gap-1 list-none select-none">
                      <MdAdd className="text-sm" /> Registrar varias a la vez
                    </summary>
                    <form onSubmit={handleRegistrarHerramientas} className="mt-2 flex flex-col gap-2">
                      <textarea
                        rows={3}
                        className={estiloInput}
                        placeholder={"Martillo\nEspátula\nCasco de seguridad"}
                        value={nombresHerramientas}
                        onChange={(e) => setNombresHerramientas(e.target.value)}
                      />
                      <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-tertiary text-white rounded-xl hover:bg-tertiary/90 transition text-sm font-semibold">
                        <FaWrench /> Registrar todas
                      </button>
                    </form>
                  </details>

                  {herramientas.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-on-surface-variant">
                          Registradas <span className="text-primary font-bold">({herramientas.length})</span>
                        </p>
                        <select
                          value={filtroHerr}
                          onChange={(e) => setFiltroHerr(e.target.value)}
                          className="border border-outline-variant rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="todos">Todos</option>
                          {Object.entries(ESTILOS_HERR).map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                        {herramientas
                          .filter((h) => filtroHerr === 'todos' || h.estado === filtroHerr)
                          .map((h) => {
                            const est = ESTILOS_HERR[h.estado] || ESTILOS_HERR.entregada;
                            return (
                              <div key={h.id} className={`border-l-4 ${est.borde} bg-surface-container-low rounded-r-xl px-3 py-2`}>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="font-medium text-on-surface text-sm truncate">{h.nombre}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${est.badge}`}>
                                    {est.label}
                                  </span>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                  {Object.entries(ESTILOS_HERR)
                                    .filter(([val]) => val !== h.estado)
                                    .map(([val, info]) => (
                                      <button
                                        key={val}
                                        onClick={() => handleCambiarEstadoHerramienta(h.id, val)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition hover:opacity-75 ${info.badge}`}
                                      >
                                        {info.label}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Alertas & Balance */}
              {tabActivo === 'alertas' && (
                <div className="flex flex-col gap-5">
                  {esJefe && cuadrillaActiva.jefe_id === usuario?.id && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Enviar alerta al coordinador</p>
                      {cuadrillaActiva.alerta_emergencia && (
                        <div className="flex items-center gap-2 bg-error-container/40 border border-error/30 rounded-xl px-3 py-2 text-xs text-on-error-container">
                          <FaExclamationTriangle /> Ya hay una alerta activa. Enviar otra la sobreescribirá.
                        </div>
                      )}
                      <form onSubmit={handleEnviarAlerta} className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 bg-error-container/40 border border-error/40 rounded-xl px-3 py-2 text-xs text-on-error-container">
                          <MdWarning className="text-base flex-shrink-0 mt-0.5" />
                          <span>Esta alerta llega <strong>inmediatamente</strong> al coordinador. Úsala solo en emergencias urgentes.</span>
                        </div>
                        <textarea
                          required
                          rows={3}
                          className={estiloInput}
                          placeholder="Describe qué está ocurriendo en terreno..."
                          value={descripcionAlerta}
                          onChange={(e) => setDescripcionAlerta(e.target.value)}
                        />
                        <button type="submit" className="flex items-center justify-center gap-2 py-2.5 bg-error text-white rounded-xl hover:bg-error/90 transition text-sm font-semibold">
                          <FaExclamationTriangle /> Enviar alerta de emergencia
                        </button>
                      </form>
                      <hr className="border-outline-variant/60" />
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Balance de herramientas</p>
                    {balance ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <FilaBalance label="Total" valor={balance.total} color="gray" />
                          <FilaBalance label="Entregadas" valor={balance.entregadas} color="blue" />
                          <FilaBalance label="Buenas" valor={balance.buenas} color="green" />
                          <FilaBalance label="Dañadas" valor={balance.danadas} color="yellow" />
                          <FilaBalance label="Perdidas" valor={balance.perdidas} color="red" />
                          <FilaBalance label="No devueltas" valor={balance.noDevueltas} color="orange" />
                        </div>
                        {balance.conDiferencias ? (
                          <div className="flex items-center gap-2 bg-error-container/40 border border-error/30 rounded-xl px-3 py-2 text-sm text-on-error-container">
                            <MdWarning /> Hay diferencias. El coordinador fue notificado.
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-secondary/5 border border-secondary/30 rounded-xl px-3 py-2 text-sm text-secondary">
                            <MdCheckCircle /> Sin diferencias en el inventario.
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-outline italic">Balance no cargado aún.</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleVerBalance}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-highest transition text-sm font-semibold border border-outline-variant"
                      >
                        <MdInfo /> Ver balance
                      </button>
                      <button
                        onClick={handleCerrarBalance}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition text-sm font-semibold"
                      >
                        <MdDone /> Cerrar balance
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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
              i <= idx ? 'bg-primary text-white' : 'bg-surface-container text-outline'
            }`}>
              {i + 1}
            </div>
            <span className={`text-[10px] capitalize whitespace-nowrap ${i <= idx ? 'text-primary font-semibold' : 'text-outline'}`}>
              {f}
            </span>
          </div>
          {i < 2 && <div className={`flex-1 h-0.5 mb-3.5 ${i < idx ? 'bg-primary' : 'bg-surface-container'}`} />}
        </Fragment>
      ))}
    </div>
  );
}

function StatCard({ valor, etiqueta, icono, colorClase, bgClase }) {
  return (
    <div className="bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow border border-outline-variant/60 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bgClase} flex items-center justify-center text-xl ${colorClase} flex-shrink-0`}>
        {icono}
      </div>
      <div>
        <p className={`text-2xl font-black tabular-nums ${colorClase}`}>{valor}</p>
        <p className="text-xs text-on-surface-variant font-medium">{etiqueta}</p>
      </div>
    </div>
  );
}

function Modal({ titulo, subtitulo, icono, onCerrar, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            {icono}
            <div>
              <h2 className="font-bold text-on-surface text-sm leading-tight">{titulo}</h2>
              {subtitulo && <p className="text-xs text-outline mt-0.5">{subtitulo}</p>}
            </div>
          </div>
          <button onClick={onCerrar} className="text-outline hover:text-on-surface-variant transition ml-2 flex-shrink-0">
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
      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{label}</label>
      {children}
      {ayuda && <p className="text-xs text-outline mt-1">{ayuda}</p>}
    </div>
  );
}

function FilaBalance({ label, valor, color }) {
  const c = {
    gray:   'bg-surface-container   text-on-surface',
    blue:   'bg-primary/10   text-primary',
    green:  'bg-secondary/10  text-secondary',
    yellow: 'bg-tertiary/10 text-tertiary',
    red:    'bg-error-container    text-on-error-container',
    orange: 'bg-tertiary/10 text-tertiary',
  };
  return (
    <div className={`rounded-xl p-3 flex justify-between items-center ${c[color] || c.gray}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-lg font-bold">{valor ?? 0}</span>
    </div>
  );
}

const estiloInput = 'w-full border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

export default GestionCuadrillas;
