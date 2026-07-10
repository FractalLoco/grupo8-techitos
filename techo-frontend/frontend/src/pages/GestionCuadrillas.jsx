import { useEffect, useState, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  MdGroups, MdAdd, MdWarning, MdCheckCircle, MdBuild, MdPersonAdd,
  MdAssignment, MdSwapHoriz, MdClose, MdRefresh, MdOutlineFilterList,
  MdError, MdInfo, MdPeople, MdSchedule, MdArrowForward, MdConstruction, MdLocationOn,
  MdDelete, MdExpandMore, MdExpandLess, MdDone,
} from 'react-icons/md';
import { FaHardHat, FaExclamationTriangle } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerEmergencias } from '../services/emergenciaService';
import { obtenerUsuarios } from '../services/usuarioService';
import {
  listarCuadrillasConEstado, listarTodasLasCuadrillasConEstado, crearCuadrilla,
  agregarMiembro, eliminarMiembro, asignarObra, actualizarFase,
  enviarAlertaEmergencia, completarCuadrilla, reasignarVoluntario,
} from '../services/cuadrillaService';
import { listarObrasPorEmergencia } from '../services/obraService';
import { obtenerCatalogoInventario } from '../services/herramientaService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import Input from '../components/ui/Input';
import { obtenerIntegrantesCuadrilla } from '../services/comunicacionesService';

const COLORES = {
  verde:    { bg: 'bg-green-50',  borde: 'border-[#006D37]',  texto: 'text-[#006D37]',  dot: 'bg-[#006D37]',  label: 'En plazo' },
  amarillo: { bg: 'bg-amber-50', borde: 'border-[#835100]', texto: 'text-[#835100]', dot: 'bg-[#835100]', label: 'Riesgo de retraso' },
  rojo:     { bg: 'bg-red-50',    borde: 'border-[#E94362]',    texto: 'text-[#E94362]',    dot: 'bg-[#E94362]',    label: 'Requiere intervención' },
  azul:     { bg: 'bg-blue-50',   borde: 'border-[#0092DD]',   texto: 'text-[#0092DD]',   dot: 'bg-[#0092DD]',   label: 'Sin obra asignada' },
  gris:     { bg: 'bg-gray-100',   borde: 'border-[#6F7882]',   texto: 'text-[#6F7882]',   dot: 'bg-[#6F7882]',   label: 'Completada' },
};

const FASES = ['limpieza', 'montaje', 'terminaciones'];

const TABS = [
  { key: 'personal', label: 'Personal', icon: <MdPeople /> },
  { key: 'obra',     label: 'Obra & Fase', icon: <MdAssignment /> },
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
  const [integrantesActiva, setIntegrantesActiva] = useState([]);
  const [cargandoIntegrantes, setCargandoIntegrantes] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const [tabActivo, setTabActivo] = useState('personal');
  const [mostrarReasignar, setMostrarReasignar] = useState(false);

  const [voluntarioId, setVoluntarioId] = useState('');
  const [habilidades, setHabilidades] = useState('');
  const [obraId, setObraId] = useState('');
  const [descripcionAlerta, setDescripcionAlerta] = useState('');
  const [cuadrillaDestinoId, setCuadrillaDestinoId] = useState('');
  const [voluntarioReasignarId, setVoluntarioReasignarId] = useState('');

  const [alertaModal, setAlertaModal] = useState({ abierto: false, titulo: '', mensaje: '' });
  const [confirmar, setConfirmar] = useState({ abierto: false, titulo: '', mensaje: '', onConfirm: () => {} });
  const [catalogo, setCatalogo] = useState([]);
  const [ocupadosIds, setOcupadosIds] = useState(new Set());
  const [liderandoIds, setLiderandoIds] = useState(new Set());
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false);

  useEffect(() => {
    obtenerCatalogoInventario().then((res) => setCatalogo(res.datos?.catalogo || [])).catch(() => {});
    const cargarBase = async () => {
      try {
        const [dataEm, dataUs] = await Promise.all([
          obtenerEmergencias(),
          obtenerUsuarios(),
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

  useEffect(() => { cargarCuadrillas(); }, [cargarCuadrillas]);

  const cuadrillasVisibles = (esJefe
    ? cuadrillas.filter((c) => c.jefe_id === usuario?.id)
    : cuadrillas
  ).filter((c) => c.estado !== 'completada' && c.estado !== 'desarmada');
  const cuadrillasCompletadas = cuadrillas.filter((c) => c.estado === 'completada' || c.estado === 'desarmada');

  // Integrantes reales de la cuadrilla abierta en el drawer (para quitar/mover con datos correctos)
  const integrantesVoluntarios = integrantesActiva.filter((i) => !i.es_jefe);
  const jefeIntegrante = integrantesActiva.find((i) => i.es_jefe);

  const stats = {
    total: cuadrillasVisibles.length + cuadrillasCompletadas.length,
    activas: cuadrillasVisibles.filter((c) => c.estado === 'activa').length,
    en_progreso: cuadrillasVisibles.filter((c) => c.estado === 'en_progreso').length,
    completadas: cuadrillasCompletadas.length,
  };
  const cuadrillasConAlerta = cuadrillasVisibles.filter((c) => c.alerta_emergencia || c.alerta_herramienta).length;

  const mostrarMensaje = (tipo, texto) => { setMensaje({ tipo, texto }); setTimeout(() => setMensaje(null), 4000); };

  // Construye el set de voluntarios ocupados desde cuadrillas ACTIVAS (no completadas/desarmadas)
  useEffect(() => {
    if (!esCoordinador) return;
    const cargarOcupados = async () => {
      try {
        const res = await listarTodasLasCuadrillasConEstado();
        const todas = res.datos?.cuadrillas || [];
        const activas = todas.filter((c) => c.estado !== 'completada' && c.estado !== 'desarmada');
        const ocupados = new Set();
        const liderando = new Set();
        for (const c of activas) {
          if (c.jefe_id) liderando.add(String(c.jefe_id));
          try {
            const data = await obtenerIntegrantesCuadrilla(c.id);
            const miembros = Array.isArray(data) ? data : (data?.integrantes || []);
            miembros.forEach((i) => ocupados.add(String(i.id)));
          } catch { /* omitir */ }
        }
        setOcupadosIds(ocupados);
        setLiderandoIds(liderando);
      } catch { /* omitir */ }
    };
    cargarOcupados();
  }, [esCoordinador]);

  // Carga los integrantes reales de una cuadrilla (para listar/quitar/mover con datos correctos)
  const cargarIntegrantes = useCallback(async (cuadrillaId) => {
    if (!cuadrillaId) return;
    setCargandoIntegrantes(true);
    try {
      const data = await obtenerIntegrantesCuadrilla(cuadrillaId);
      // el servicio devuelve el arreglo directo; toleramos ambas formas por si cambia
      const lista = Array.isArray(data) ? data : (data?.integrantes || []);
      setIntegrantesActiva(lista);
    } catch {
      setIntegrantesActiva([]);
    } finally {
      setCargandoIntegrantes(false);
    }
  }, []);

  const abrirGestionar = (cuadrilla, tabInicial = 'personal', reasignarAbierto = false) => {
    setCuadrillaActiva(cuadrilla);
    setTabActivo(tabInicial);
    setDrawerAbierto(true);
    setMostrarReasignar(reasignarAbierto);
    setIntegrantesActiva([]);
    cargarIntegrantes(cuadrilla.id);
  };

  const cerrarGestionar = () => { setDrawerAbierto(false); setCuadrillaActiva(null); setIntegrantesActiva([]); };

  const handleCrearCuadrilla = async (e) => {
    e.preventDefault();
    if (!emergenciaId) return mostrarMensaje('error', 'Selecciona una emergencia primero');
    try {
      await crearCuadrilla({ ...formCuadrilla, emergencia_id: emergenciaId });
      mostrarMensaje('exito', 'Cuadrilla creada correctamente');
      setFormCuadrilla({ nombre: '', jefe_id: '', plazo_dias: 5 });
      setMostrarFormCuadrilla(false);
      cargarCuadrillas();
    } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
  };

  const handleAgregarMiembro = async (e) => {
    e.preventDefault();
    try {
      await agregarMiembro(cuadrillaActiva.id, { voluntarioId, habilidades: habilidades || null });
      mostrarMensaje('exito', 'Miembro agregado');
      setVoluntarioId('');
      setHabilidades('');
      cargarIntegrantes(cuadrillaActiva.id);
      cargarCuadrillas();
    } catch (err) {
      const msg = err.response?.data?.mensaje || err.message;
      if (msg.includes('ya pertenece a una cuadrilla') || msg.includes('no está disponible')) {
        setAlertaModal({ abierto: true, titulo: 'Voluntario no disponible', mensaje: msg });
      } else {
        mostrarMensaje('error', msg);
      }
    }
  };

  const handleEliminarMiembro = async (volId) => {
    try {
      await eliminarMiembro(cuadrillaActiva.id, volId);
      mostrarMensaje('exito', 'Miembro quitado de la cuadrilla');
      cargarIntegrantes(cuadrillaActiva.id);
      cargarCuadrillas();
    } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
  };

  const handleAsignarObra = async (e) => {
    e.preventDefault();
    const nuevaObraId = Number(obraId);
    try {
      const res = await asignarObra(cuadrillaActiva.id, obraId);
      const actualizada = res?.datos?.cuadrilla;
      mostrarMensaje('exito', 'Obra asignada y notificaciones enviadas');
      setObraId('');
      // Deja el drawer abierto en Obra & Fase para iniciar el trabajo de inmediato
      setCuadrillaActiva((prev) => (prev ? { ...prev, obra_asignada_id: actualizada?.obra_asignada_id ?? nuevaObraId } : prev));
      cargarCuadrillas();
    } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
  };

  const handleCompletarCuadrilla = async (id) => {
    setConfirmar({
      abierto: true,
      titulo: 'Completar cuadrilla',
      mensaje: '¿Marcar la cuadrilla como completada y liberar a los voluntarios?',
      onConfirm: async () => {
        setConfirmar((c) => ({ ...c, abierto: false }));
        try {
          await completarCuadrilla(id);
          mostrarMensaje('exito', 'Cuadrilla completada y desarmada');
          cargarCuadrillas();
        } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
      },
    });
  };

  const handleReasignar = async (e) => {
    e.preventDefault();
    try {
      await reasignarVoluntario(cuadrillaActiva.id, voluntarioReasignarId, cuadrillaDestinoId);
      mostrarMensaje('exito', 'Voluntario movido a la otra cuadrilla');
      setCuadrillaDestinoId('');
      setVoluntarioReasignarId('');
      setMostrarReasignar(false);
      cargarIntegrantes(cuadrillaActiva.id);
      cargarCuadrillas();
    } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
  };

  // Salto a una fase concreta (selección manual). Actualiza el drawer en vivo, sin cerrarlo.
  const handleActualizarFase = async (fase) => {
    try {
      await actualizarFase(cuadrillaActiva.id, fase);
      mostrarMensaje('exito', `Fase actualizada a "${fase}"`);
      setCuadrillaActiva((prev) => (prev ? { ...prev, fase } : prev));
      cargarCuadrillas();
    } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
  };

  const handleEnviarAlerta = async (e) => {
    e.preventDefault();
    try {
      await enviarAlertaEmergencia(cuadrillaActiva.id, descripcionAlerta);
      mostrarMensaje('exito', 'Alerta enviada al coordinador');
      setDescripcionAlerta('');
      cerrarGestionar();
      cargarCuadrillas();
    } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
  };



  // Devuelve la fase que sigue a la actual, o null si ya está en la última.
  const faseSiguiente = (fase) => {
    if (!fase) return FASES[0];
    const i = FASES.indexOf(fase);
    return i === -1 ? FASES[0] : (FASES[i + 1] || null);
  };

  // Botón "avanzar de fase": pide confirmación en modal y actualiza secuencialmente.
  const handleAvanzarFase = (c) => {
    const siguiente = faseSiguiente(c.fase);
    if (!siguiente) { handleCompletarCuadrilla(c.id); return; }
    setConfirmar({
      abierto: true,
      titulo: c.fase ? `Avanzar a "${siguiente}"` : 'Iniciar trabajo',
      mensaje: c.fase
        ? `¿Confirmas que "${c.nombre}" pasa de la fase "${c.fase}" a "${siguiente}"?`
        : `¿Iniciar "${c.nombre}" en la fase "${siguiente}"?`,
      onConfirm: async () => {
        setConfirmar((s) => ({ ...s, abierto: false }));
        try {
          await actualizarFase(c.id, siguiente);
          mostrarMensaje('exito', `Fase actualizada a "${siguiente}"`);
          setCuadrillaActiva((prev) => (prev && prev.id === c.id ? { ...prev, fase: siguiente } : prev));
          cargarCuadrillas();
        } catch (err) { mostrarMensaje('error', err.response?.data?.mensaje || err.message); }
      },
    });
  };

  const colorInfo = (c) => COLORES[c] || COLORES.gris;
  const nombreJefe = (jefe_id) => { const u = usuarios.find((u) => u.id === jefe_id); return u ? u.nombre : '—'; };
  const nombreObra = (obra_id) => { const o = obras.find((o) => o.id === obra_id); return o ? o.nombre : null; };

  const getPrimaryAction = (c) => {
    if (c.estado === 'completada' || c.estado === 'desarmada') return null;
    if (esCoordinador) {
      // Flujo secuencial: completar equipo → asignar obra → iniciar → avanzar fase por fase → terminar
      if ((c.miembrosCount ?? 0) < 10)
        return { label: `Agregar miembros (${c.miembrosCount ?? 0}/10 mín.)`, icon: <MdPersonAdd />, color: 'btn-primary', onClick: () => abrirGestionar(c, 'personal') };
      if (!c.obra_asignada_id)
        return emergenciaId
          ? { label: 'Asignar obra', icon: <MdAssignment />, color: 'btn-primary', onClick: () => abrirGestionar(c, 'obra') }
          : { label: 'Selecciona la emergencia para asignar obra', icon: <MdAssignment />, color: 'bg-surface-container text-outline cursor-default', onClick: () => mostrarMensaje('error', 'Selecciona la emergencia de esta cuadrilla para asignar una obra') };
      if (!c.fase)
        return { label: 'Iniciar trabajo (limpieza)', icon: <MdBuild />, color: 'btn-success', onClick: () => handleAvanzarFase(c) };
      if (c.fase !== 'terminaciones')
        return { label: `Avanzar a ${faseSiguiente(c.fase)}`, icon: <MdArrowForward />, color: 'btn-success', onClick: () => handleAvanzarFase(c) };
      return { label: 'Terminar tarea', icon: <MdDone />, color: 'btn-success', onClick: () => handleCompletarCuadrilla(c.id) };
    }
    if (esJefe && c.jefe_id === usuario?.id) {
      if (!c.obra_asignada_id) return { label: 'Esperando obra', icon: <MdSchedule />, color: 'bg-surface-container text-outline cursor-default', onClick: () => {} };
      if (!c.fase) return { label: 'Iniciar (limpieza)', icon: <MdBuild />, color: 'btn-success', onClick: () => handleAvanzarFase(c) };
      if (c.fase !== 'terminaciones') return { label: `Avanzar a ${faseSiguiente(c.fase)}`, icon: <MdArrowForward />, color: 'btn-success', onClick: () => handleAvanzarFase(c) };
      return { label: 'Cerrar balance del día', icon: <MdDone />, color: 'btn-primary', onClick: () => abrirGestionar(c, 'alertas') };
    }
    return null;
  };

  const tabsVisibles = (cuadrilla) => {
    if (!cuadrilla) return TABS;
    const puedePersonal = esCoordinador || (esJefe && cuadrilla.jefe_id === usuario?.id);
    return TABS.filter((t) => {
      if (t.key === 'personal' && !puedePersonal) return false;
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="page-header">
          <div className="page-header-content">
            <MdGroups className="page-header-icon" />
            <h1 className="page-header-title">Gestión de Cuadrillas</h1>
            <div className="flex items-center gap-1.5">
              <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
              <select
                className="page-select"
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
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Link to="/obras" className="btn-secondary">
                  <MdConstruction /> Gestionar obras
                </Link>
                <Button
                  variant="secondary"
                  className={!emergenciaId ? 'opacity-50 cursor-not-allowed' : ''}
                  onClick={() => {
                    if (!emergenciaId) { mostrarMensaje('error', 'Selecciona una emergencia primero'); return; }
                    setMostrarFormCuadrilla(true);
                  }}
                >
                  <MdAdd /> Nueva cuadrilla
                </Button>
              </div>
            )}
          </div>
        </div>

        {mensaje && <Toast type={mensaje.tipo === 'exito' ? 'success' : 'error'} message={mensaje.texto} />}

        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-3 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-3">
          {!emergenciaId && cuadrillasVisibles.length > 0 && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/30 rounded-xl px-4 py-2.5 text-xs text-primary font-medium">
              <MdInfo className="text-base flex-shrink-0" />
              Vista global — mostrando todas las cuadrillas del sistema. Selecciona una emergencia para crear o asignar obras.
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <StatCard valor={stats.total} etiqueta="Equipos" icono={<MdGroups />} colorBar="border-t-primary" />
            <StatCard valor={stats.activas} etiqueta="Activas" icono={<MdPeople />} colorBar="border-t-[#0092DD]" />
            <StatCard valor={stats.en_progreso} etiqueta="En marcha" icono={<MdConstruction />} colorBar="border-t-[#835100]" />
            <StatCard valor={cuadrillasConAlerta} etiqueta="Alertas" icono={<MdWarning />} colorBar="border-t-[#E94362]" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-xl border border-outline-variant/60 px-3 py-2 shadow-sm">
            <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
              <MdOutlineFilterList className="text-base text-primary" /> Filtrar:
            </span>
              <button
                onClick={() => setFiltroColor('')}
                className={`filter-btn !px-2 !py-0.5 ${filtroColor === '' ? 'filter-btn-active' : 'filter-btn-inactive'}`}
              >
                Todos
              </button>
              {Object.entries(COLORES).map(([clave, info]) => (
                <button
                  key={clave}
                  onClick={() => setFiltroColor(clave)}
                  className={`filter-btn !px-2 !py-0.5 flex items-center gap-1 ${
                    filtroColor === clave ? `${info.bg} ${info.texto} ${info.borde}` : 'filter-btn-inactive'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                  {info.label}
                </button>
              ))}
              <button
                onClick={cargarCuadrillas}
                className="ml-auto flex items-center gap-1 px-2 py-1 bg-surface-container hover:bg-surface-container-highest rounded-lg text-[10px] text-on-surface-variant transition border border-outline-variant"
              >
                <MdRefresh className="text-xs" /> Actualizar
              </button>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-outline">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando cuadrillas...</span>
            </div>
          ) : (cuadrillasVisibles.length === 0 && cuadrillasCompletadas.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-outline">
              <MdGroups className="text-6xl mb-3 opacity-20" />
              <p className="text-sm font-medium text-on-surface-variant">
                {filtroColor
                  ? `No hay cuadrillas con estado "${COLORES[filtroColor]?.label}"`
                  : emergenciaId ? 'No hay cuadrillas en esta emergencia' : 'No hay cuadrillas registradas en el sistema'}
              </p>
              {esCoordinador && !filtroColor && emergenciaId && (
                <Button className="mt-4" onClick={() => setMostrarFormCuadrilla(true)}>
                  <MdAdd /> Crear primera cuadrilla
                </Button>
              )}
            </div>
          ) : (
            <>
              {cuadrillasVisibles.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xs font-bold text-on-surface">Cuadrillas activas</h2>
                {cuadrillasConAlerta > 0 && (
                  <Badge color="error" className="text-[10px] ml-auto">
                    <FaExclamationTriangle className="text-[8px]" /> {cuadrillasConAlerta} alerta{cuadrillasConAlerta > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {cuadrillasVisibles.map((c, idx) => {
                  const ci = colorInfo(c.estadoColor);
                  const jefe = nombreJefe(c.jefe_id);
                  const obra = c.obra_asignada_id ? nombreObra(c.obra_asignada_id) : null;
                  const cta = getPrimaryAction(c);
                  const puedeGestionar =
                    c.estado !== 'completada' && c.estado !== 'desarmada' &&
                    (esCoordinador || (esJefe && c.jefe_id === usuario?.id));


                  return (
                    <div
                      key={c.id}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="card animate-fadeInUp flex flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-200"
                    >
                      <div className={`h-1 flex-shrink-0 ${
                        c.estadoColor === 'verde' ? 'bg-[#006D37]' :
                        c.estadoColor === 'amarillo' ? 'bg-[#835100]' :
                        c.estadoColor === 'rojo' ? 'bg-error' :
                        c.estadoColor === 'azul' ? 'bg-primary' :
                        'bg-outline'
                      }`} />

                      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0 uppercase">
                            {c.nombre.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h2 className="font-bold text-on-surface text-sm truncate">{c.nombre}</h2>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <FaHardHat className="text-[#835100] text-[10px] flex-shrink-0" />
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
                        <Badge color={c.estadoColor === 'verde' ? 'success' : c.estadoColor === 'rojo' ? 'error' : c.estadoColor === 'amarillo' ? 'warning' : c.estadoColor === 'azul' ? 'blue' : 'gray'}>
                          {ci.label}
                        </Badge>
                      </div>

                      <div className="px-4 py-2 border-t border-surface-container flex flex-wrap gap-x-4 gap-y-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <MdPeople className="text-primary text-sm" />
                            <span>
                              <strong className={(c.miembrosCount ?? 0) < 10 ? 'text-[#835100]' : 'text-on-surface'}>
                                {c.miembrosCount ?? '?'}
                              </strong>
                              <span className="text-outline">/11</span>
                            </span>
                          </div>
                          <div className="w-28 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(c.miembrosCount ?? 0) >= 10 ? 'bg-[#006D37]' : (c.miembrosCount ?? 0) >= 6 ? 'bg-[#835100]' : 'bg-error'}`}
                              style={{ width: `${Math.min(((c.miembrosCount ?? 0) / 11) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <MdSchedule className="text-primary text-sm" />
                          <span><strong className="text-on-surface">{c.plazo_dias}</strong>d</span>
                        </div>
                        {c.fase && <Badge color={c.fase === 'terminaciones' ? 'success' : c.fase === 'montaje' ? 'blue' : 'gray'}>{c.fase}</Badge>}
                      </div>

                      {c.fase && (
                        <div className="px-4 py-3 border-t border-surface-container">
                          <ProgresoFase fase={c.fase} />
                        </div>
                      )}

                      {c.alerta_emergencia && (
                        <div className="mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-error/30 rounded-xl px-3 py-2 text-xs text-error">
                          <FaExclamationTriangle className="flex-shrink-0 mt-0.5" />
                          <span><strong>Alerta:</strong> {c.descripcion_emergencia}</span>
                        </div>
                      )}


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
                        {esCoordinador && c.estado !== 'completada' && c.estado !== 'desarmada' && (
                          <button
                            onClick={() => abrirGestionar(c, 'personal', true)}
                            className="px-3 py-3 text-[#835100] hover:text-[#835100] hover:bg-amber-50 transition flex-shrink-0"
                            title="Reasignar voluntario"
                          >
                            <MdSwapHoriz className="text-base" />
                          </button>
                        )}
                        {esCoordinador && (
                          <button
                            onClick={() => handleCompletarCuadrilla(c.id)}
                            className="px-3 py-3 text-error hover:bg-red-50 transition flex-shrink-0"
                            title="Eliminar / Desarmar cuadrilla"
                          >
                            <MdDelete className="text-base" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {cuadrillasCompletadas.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setMostrarCompletadas(!mostrarCompletadas)}
                    className="flex items-center gap-2 text-xs font-semibold text-outline hover:text-on-surface transition w-full"
                  >
                    <span className="h-px flex-1 bg-outline-variant/60" />
                    {mostrarCompletadas ? <MdExpandLess /> : <MdExpandMore />}
                    <span>Completadas ({cuadrillasCompletadas.length})</span>
                    <span className="h-px flex-1 bg-outline-variant/60" />
                  </button>
                  {(mostrarCompletadas || filtroColor === 'gris') && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                      {cuadrillasCompletadas.map((c, idx) => {
                        const jefe = nombreJefe(c.jefe_id);
                        const obra = c.obra_asignada_id ? nombreObra(c.obra_asignada_id) : null;
                        return (
                          <div key={c.id} className="card opacity-70 flex flex-col overflow-hidden">
                            <div className="h-1 flex-shrink-0 bg-outline" />
                            <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-outline text-white text-sm font-bold flex items-center justify-center flex-shrink-0 uppercase">
                                  {c.nombre.slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <h2 className="font-bold text-outline text-sm truncate line-through">{c.nombre}</h2>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <FaHardHat className="text-outline text-[10px] flex-shrink-0" />
                                    <span className="text-xs text-outline truncate">{jefe}</span>
                                  </div>
                                  {obra && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <MdLocationOn className="text-outline text-xs flex-shrink-0" />
                                      <span className="text-xs text-outline truncate">{obra}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge color="gray">Completada</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar — personal activo/ocupado (coordinador y jefe) */}
        {(esCoordinador || esJefe) && (
          <div className="w-full lg:w-56 flex-shrink-0 lg:sticky lg:top-[70px]">
            <div className="card overflow-hidden">
              <div className="px-2.5 py-2 border-b border-outline-variant/60 flex items-center gap-1.5">
                <MdPeople className="text-primary text-sm" />
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wide">
                  {esJefe ? 'Mi equipo' : 'Personal'}
                </span>
                {esCoordinador && (
                  <span className="ml-auto text-[9px] text-outline">
                    {ocupadosIds.size + liderandoIds.size}/{usuarios.length}
                  </span>
                )}
              </div>
              <div className="p-1.5 max-h-[calc(100vh-140px)] overflow-y-auto">
                {esCoordinador && (
                  <>
                    {/* Jefes */}
                    <div className="mb-2">
                      <p className="text-[9px] font-semibold text-outline uppercase tracking-wide px-1.5 py-0.5">Jefes</p>
                      {usuarios.filter((u) => u.rol === 'jefe_cuadrilla').map((u) => {
                        const ocupado = liderandoIds.has(String(u.id));
                        return (
                          <div key={u.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-surface-container transition cursor-default">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ocupado ? 'bg-error' : 'bg-[#006D37]'}`} />
                            <span className={`text-[11px] truncate ${ocupado ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                              {u.nombre}
                            </span>
                            {ocupado && <span className="text-[8px] text-error font-semibold ml-auto flex-shrink-0">lidera</span>}
                          </div>
                        );
                      })}
                      {usuarios.filter((u) => u.rol === 'jefe_cuadrilla').length === 0 && (
                        <p className="text-[10px] text-outline italic px-1.5 py-1">Sin jefes registrados</p>
                      )}
                    </div>

                    {/* Voluntarios ocupados */}
                    {(() => {
                      const ocupados = usuarios.filter((u) => u.rol === 'voluntario' && ocupadosIds.has(String(u.id)));
                      if (ocupados.length === 0) return null;
                      return (
                        <div className="mb-2">
                          <p className="text-[9px] font-semibold text-outline uppercase tracking-wide px-1.5 py-0.5">
                            Ocupados <span className="text-error font-bold">({ocupados.length})</span>
                          </p>
                          {ocupados.map((u) => (
                            <div key={u.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-surface-container transition cursor-default">
                              <span className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                              <span className="text-[11px] text-on-surface truncate">{u.nombre}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Voluntarios disponibles */}
                    {(() => {
                      const libres = usuarios.filter((u) => u.rol === 'voluntario' && !ocupadosIds.has(String(u.id)));
                      if (libres.length === 0) return null;
                      return (
                        <div>
                          <p className="text-[9px] font-semibold text-outline uppercase tracking-wide px-1.5 py-0.5">
                            Disp. <span className="text-[#006D37] font-bold">({libres.length})</span>
                          </p>
                          {libres.map((u) => (
                            <div key={u.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-surface-container transition cursor-default">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#006D37] flex-shrink-0" />
                              <span className="text-[11px] text-on-surface-variant truncate">{u.nombre}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}

                {esJefe && (() => {
                  const miCuadrilla = cuadrillas.find((c) => c.jefe_id === usuario?.id);
                  return (
                  <div className="px-1.5 py-1">
                    {miCuadrilla ? (
                      <>
                        <p className="text-[9px] font-semibold text-outline uppercase tracking-wide mb-1">
                          Integrantes de {miCuadrilla?.nombre || 'tu cuadrilla'}
                        </p>
                        <p className="text-[10px] text-outline italic px-1.5 py-2 text-center">
                          <MdPeople className="text-base inline-block mb-0.5 mr-1" />
                          {miCuadrilla?.miembrosCount ?? '?'} miembros
                        </p>
                        <div className="mt-2 border-t border-outline-variant/60 pt-2">
                          <p className="text-[9px] font-semibold text-outline uppercase tracking-wide px-1.5 py-0.5">Voluntarios activos en la emergencia</p>
                          {(() => {
                            const miembros = usuarios.filter((u) => u.rol === 'voluntario');
                            if (miembros.length === 0) return <p className="text-[10px] text-outline italic px-1.5 py-1">Sin datos</p>;
                            return miembros.map((u) => {
                              const ocupado = ocupadosIds.has(String(u.id));
                              return (
                                <div key={u.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-surface-container transition cursor-default">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ocupado ? 'bg-error' : 'bg-[#006D37]'}`} />
                                  <span className={`text-[11px] truncate ${ocupado ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                                    {u.nombre}
                                  </span>
                                  {ocupado && <span className="text-[8px] text-outline ml-auto flex-shrink-0">en obra</span>}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-outline italic px-1.5 py-2 text-center">
                        No tienes una cuadrilla asignada aún
                      </p>
                    )}
                  </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón nueva cuadrilla en el header (reemplaza el FAB) */}

      {/* Modal: nueva cuadrilla */}
      <Modal
        open={mostrarFormCuadrilla}
        onClose={() => setMostrarFormCuadrilla(false)}
        title="Nueva cuadrilla"
        subtitle="Completa los datos para crear un nuevo equipo de trabajo"
        icon={<MdGroups className="text-primary text-xl" />}
      >
        <form onSubmit={handleCrearCuadrilla} className="flex flex-col gap-4">
          <Input
            label="Nombre de la cuadrilla"
            help="Usa un nombre descriptivo que identifique la zona o trabajo"
            placeholder="Ej: Cuadrilla Norte A"
            required
            value={formCuadrilla.nombre}
            onChange={(e) => setFormCuadrilla({ ...formCuadrilla, nombre: e.target.value })}
          />
          <div>
            <label className="label">Jefe de cuadrilla</label>
            <select
              required
              className="input-field"
              value={formCuadrilla.jefe_id}
              onChange={(e) => setFormCuadrilla({ ...formCuadrilla, jefe_id: e.target.value })}
            >
              <option value="">— Selecciona jefe —</option>
              {usuarios.filter((u) => u.rol === 'jefe_cuadrilla' && u.activo).map((u) => (
                <option key={u.id} value={u.id}>{u.nombre} · {u.rut}</option>
              ))}
            </select>
            <p className="text-xs text-outline mt-1">Solo jefes activos pueden liderar una cuadrilla</p>
          </div>
          <div>
            <label className="label">Plazo de entrega</label>
            <div className="grid grid-cols-2 gap-2">
              {[2, 5].map((dias) => (
                <label
                  key={dias}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition ${
                    formCuadrilla.plazo_dias === dias
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  <input type="radio" className="sr-only" value={dias} checked={formCuadrilla.plazo_dias === dias} onChange={() => setFormCuadrilla({ ...formCuadrilla, plazo_dias: dias })} />
                  <MdSchedule />
                  {dias} días {dias === 2 ? '(menor)' : '(mayor)'}
                </label>
              ))}
            </div>
            <p className="text-xs text-outline mt-1">Los voluntarios se agregan después de crear la cuadrilla (10–11 integrantes)</p>
          </div>
          <Button type="submit"><MdAdd /> Crear cuadrilla</Button>
        </form>
      </Modal>

      {/* Drawer de gestión */}
      {drawerAbierto && cuadrillaActiva && (
        <div className="fixed inset-0 z-[500] flex">
          <div className="flex-1 bg-black/40 cursor-pointer" onClick={cerrarGestionar} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col" style={{ height: '100vh' }}>
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

            <div className="flex-1 overflow-y-auto p-5">
              {tabActivo === 'personal' && (
                <div className="flex flex-col gap-5">
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border ${
                    (cuadrillaActiva.miembrosCount ?? 0) < 10
                      ? 'bg-amber-50 border-[#835100]/30 text-[#835100]'
                      : 'bg-green-50 border-[#006D37]/30 text-[#006D37]'
                  }`}>
                    <MdPeople />
                    <span>
                      <strong>{cuadrillaActiva.miembrosCount ?? 0}</strong> de 10–11 integrantes requeridos
                      {(cuadrillaActiva.miembrosCount ?? 0) < 10 && ` — faltan ${10 - (cuadrillaActiva.miembrosCount ?? 0)} para el mínimo`}
                    </span>
                  </div>

                  {/* Integrantes actuales — quitar o mover con datos reales de la cuadrilla */}
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <MdPeople /> Integrantes actuales
                      <span className="ml-auto text-outline font-normal normal-case">
                        {cargandoIntegrantes ? 'cargando…' : `${integrantesVoluntarios.length} voluntario${integrantesVoluntarios.length === 1 ? '' : 's'}`}
                      </span>
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {jefeIntegrante && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#835100]/30 bg-amber-50">
                          <FaHardHat className="text-[#835100] text-xs flex-shrink-0" />
                          <span className="text-sm text-on-surface font-medium truncate">{jefeIntegrante.nombre}</span>
                          <span className="ml-auto text-[10px] text-[#835100] font-bold uppercase">Jefe</span>
                        </div>
                      )}
                      {integrantesVoluntarios.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container/40">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 uppercase">
                            {m.nombre?.slice(0, 2)}
                          </span>
                          <span className="text-sm text-on-surface truncate">{m.nombre}</span>
                          {esCoordinador && (
                            <button
                              onClick={() => handleEliminarMiembro(m.id)}
                              disabled={integrantesVoluntarios.length <= 10}
                              title={integrantesVoluntarios.length <= 10 ? 'La cuadrilla debe conservar al menos 10 integrantes' : 'Quitar de la cuadrilla'}
                              className="ml-auto p-1.5 rounded-lg text-error hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                            >
                              <MdClose className="text-base" />
                            </button>
                          )}
                        </div>
                      ))}
                      {!cargandoIntegrantes && integrantesVoluntarios.length === 0 && (
                        <p className="text-xs text-outline italic px-1 py-2">Aún no hay voluntarios en esta cuadrilla.</p>
                      )}
                    </div>
                  </div>

                  {esCoordinador && (
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-2">Agregar voluntario</p>
                      <form onSubmit={handleAgregarMiembro} className="flex flex-col gap-2">
                        <select required className="input-field" value={voluntarioId} onChange={(e) => setVoluntarioId(e.target.value)}>
                          <option value="">— Selecciona voluntario —</option>
                          {usuarios.filter((u) => u.rol === 'voluntario' && u.activo && !ocupadosIds.has(String(u.id))).map((u) => (
                            <option key={u.id} value={u.id}>{u.nombre} · {u.rut}</option>
                          ))}
                        </select>
                        <input
                          className="input-field"
                          placeholder="Habilidades (opcional) — ej: carpintería"
                          value={habilidades}
                          onChange={(e) => setHabilidades(e.target.value)}
                        />
                        <Button type="submit"><MdPersonAdd /> Agregar a cuadrilla</Button>
                      </form>
                    </div>
                  )}

                  {esCoordinador && (
                    <div>
                      <p className="text-xs font-semibold text-[#835100] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <MdSwapHoriz /> Reasignar voluntario a otra cuadrilla
                      </p>
                      <form onSubmit={handleReasignar} className="flex flex-col gap-2 p-3 bg-amber-50 border border-[#835100]/30 rounded-xl">
                        <p className="text-xs text-[#835100] font-medium">
                          Mueve un voluntario desde <strong>{cuadrillaActiva.nombre}</strong> a otra cuadrilla activa.
                        </p>
                        <select required className="input-field" value={voluntarioReasignarId} onChange={(e) => setVoluntarioReasignarId(e.target.value)}>
                          <option value="">— Voluntario a mover —</option>
                          {integrantesVoluntarios.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre}</option>
                          ))}
                        </select>
                        {integrantesVoluntarios.length === 0 && !cargandoIntegrantes && (
                          <p className="text-[11px] text-[#835100]">Esta cuadrilla no tiene voluntarios para mover.</p>
                        )}
                        <div className="flex items-center gap-2 text-outline text-xs">
                          <MdArrowForward />
                          <span>hacia</span>
                        </div>
                        <select required className="input-field" value={cuadrillaDestinoId} onChange={(e) => setCuadrillaDestinoId(e.target.value)}>
                          <option value="">— Cuadrilla destino —</option>
                          {cuadrillas
                            .filter((c) => c.id !== cuadrillaActiva.id && c.estado !== 'completada' && c.estado !== 'desarmada')
                            .map((c) => {
                              const llena = (c.miembrosCount ?? 0) >= 11;
                              return (
                                <option key={c.id} value={c.id} disabled={llena}>
                                  {c.nombre} ({c.miembrosCount ?? '?'}/11){llena ? ' — completa' : ''}
                                </option>
                              );
                            })}
                        </select>
                        <Button variant="primary" type="submit"><MdSwapHoriz /> Confirmar reasignación</Button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {tabActivo === 'obra' && (
                <div className="flex flex-col gap-5">
                  {esCoordinador && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Asignar obra</p>
                      {cuadrillaActiva.obra_asignada_id ? (
                        <div className="flex items-center gap-2 bg-green-50 border border-[#006D37]/30 rounded-xl px-3 py-2 text-xs text-[#006D37]">
                          <MdCheckCircle /> Obra ya asignada: <strong className="ml-1">{nombreObra(cuadrillaActiva.obra_asignada_id) || '—'}</strong>
                        </div>
                      ) : (
                        <form onSubmit={handleAsignarObra} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 bg-primary-50 border border-primary/30 rounded-xl px-3 py-2 text-xs text-primary">
                            <MdAssignment />
                            Al asignar, todos los integrantes recibirán notificación con la ubicación y el plazo.
                          </div>
                          <select required className="input-field" value={obraId} onChange={(e) => setObraId(e.target.value)}>
                            <option value="">— Selecciona obra —</option>
                            {obras.filter((o) => o.estado === 'disponible').map((o) => (
                              <option key={o.id} value={o.id}>{o.nombre}{o.direccion ? ` — ${o.direccion}` : ''}</option>
                            ))}
                          </select>
                          {obras.filter((o) => o.estado === 'disponible').length === 0 && (
                            <div className="rounded-xl border border-amber-600/20 bg-amber-50 px-3 py-2 text-xs text-[#835100]">
                              No hay obras disponibles en esta emergencia.{' '}
                              <Link to="/obras" className="font-bold underline">Crear o revisar obras</Link>.
                            </div>
                          )}
                          <Button type="submit" disabled={!obraId}><MdAssignment /> Asignar obra</Button>
                        </form>
                      )}
                    </div>
                  )}

                  {esCoordinador && <hr className="border-outline-variant/60" />}

                  {/* Apartado de FASE — iniciar y avanzar el trabajo paso a paso (coordinador y jefe) */}
                  {(esCoordinador || (esJefe && cuadrillaActiva.jefe_id === usuario?.id)) && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide flex items-center gap-1.5">
                        <MdConstruction /> Fase del trabajo
                      </p>

                      {!cuadrillaActiva.obra_asignada_id ? (
                        <div className="bg-amber-50 border border-[#835100]/30 rounded-xl px-3 py-2 text-xs text-[#835100]">
                          {esCoordinador
                            ? 'Asigna una obra arriba para poder iniciar y avanzar las fases.'
                            : 'No hay obra asignada aún. Espera la asignación del coordinador.'}
                        </div>
                      ) : (
                        <>
                          <div className="py-3 px-3 bg-surface-container/40 rounded-xl border border-outline-variant/60">
                            <ProgresoFase fase={cuadrillaActiva.fase || ''} />
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs text-on-surface-variant">
                              Fase actual: <strong className="capitalize text-on-surface">{cuadrillaActiva.fase || 'sin iniciar'}</strong>
                            </span>
                            {faseSiguiente(cuadrillaActiva.fase) ? (
                              <Button variant="success" onClick={() => handleAvanzarFase(cuadrillaActiva)}>
                                {cuadrillaActiva.fase
                                  ? <><MdArrowForward /> Avanzar a {faseSiguiente(cuadrillaActiva.fase)}</>
                                  : <><MdBuild /> Iniciar (limpieza)</>}
                              </Button>
                            ) : (
                              <Button variant="success" onClick={() => handleCompletarCuadrilla(cuadrillaActiva.id)}>
                                <MdDone /> Terminar tarea
                              </Button>
                            )}
                          </div>

                          <details className="mt-1">
                            <summary className="text-[11px] text-outline cursor-pointer select-none">Ir a una fase específica</summary>
                            <div className="flex flex-col gap-2 mt-2">
                              {FASES.map((f, i) => {
                                const esActual = cuadrillaActiva.fase === f;
                                return (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() => !esActual && handleActualizarFase(f)}
                                    disabled={esActual}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border-2 transition text-left ${
                                      esActual ? 'border-[#006D37] bg-green-50 cursor-default' : 'border-outline-variant hover:border-outline'
                                    }`}
                                  >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                      FASES.indexOf(cuadrillaActiva.fase ?? '') >= i ? 'bg-[#006D37] text-white' : 'bg-surface-container-highest text-on-surface-variant'
                                    }`}>{i + 1}</span>
                                    <span className="flex-1 text-sm font-semibold capitalize text-on-surface">{f}</span>
                                    {esActual && <span className="text-[10px] text-[#006D37] font-bold">ACTUAL</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </details>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tabActivo === 'alertas' && (
                <div className="flex flex-col gap-5">
                  {esJefe && cuadrillaActiva.jefe_id === usuario?.id && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Enviar alerta al coordinador</p>
                      {cuadrillaActiva.alerta_emergencia && (
                        <div className="flex items-center gap-2 bg-red-50 border border-error/30 rounded-xl px-3 py-2 text-xs text-error">
                          <FaExclamationTriangle /> Ya hay una alerta activa. Enviar otra la sobreescribirá.
                        </div>
                      )}
                      <form onSubmit={handleEnviarAlerta} className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 bg-red-50 border border-error/40 rounded-xl px-3 py-2 text-xs text-error">
                          <MdWarning className="text-base flex-shrink-0 mt-0.5" />
                          <span>Esta alerta llega <strong>inmediatamente</strong> al coordinador. Úsala solo en emergencias urgentes.</span>
                        </div>
                        <textarea
                          required
                          rows={3}
                          className="input-field"
                          placeholder="Describe qué está ocurriendo en terreno..."
                          value={descripcionAlerta}
                          onChange={(e) => setDescripcionAlerta(e.target.value)}
                        />
                        <Button variant="error" type="submit"><FaExclamationTriangle /> Enviar alerta de emergencia</Button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal alerta voluntario no disponible */}
      <Modal
        open={alertaModal.abierto}
        onClose={() => setAlertaModal({ ...alertaModal, abierto: false })}
        title={alertaModal.titulo}
        icon={<MdWarning className="text-error text-xl" />}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-red-50 border border-error/30 rounded-xl px-4 py-3 text-sm text-error">
            {alertaModal.mensaje}
          </div>
          <Button variant="primary" onClick={() => setAlertaModal({ ...alertaModal, abierto: false })}>
            Entendido
          </Button>
        </div>
      </Modal>

      {/* Modal de confirmación genérico */}
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
  </div>
  );
}

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

function StatCard({ valor, etiqueta, icono, colorBar }) {
  return (
    <div className={`stat-card border-t-[3px] ${colorBar}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-primary text-lg">{icono}</span>
        <span className="stat-label">{etiqueta}</span>
      </div>
      <span className="stat-value text-on-surface">{valor}</span>
    </div>
  );
}

export default GestionCuadrillas;
