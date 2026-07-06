import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdInventory,
  MdBuild,
  MdWarning,
  MdCheckCircle,
  MdFilterList,
  MdError,
  MdClose,
  MdThumbUp,
  MdThumbDown,
  MdArrowUpward,
  MdArrowDownward,
  MdPerson,
  MdLocationOn,
  MdAdd,
  MdRefresh,
  MdInfo,
  MdPlaylistAdd,
  MdGroups,
} from 'react-icons/md';
import { FaWrench, FaHardHat, FaBoxes } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { obtenerInventarioTotal } from '../services/herramientaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import {
  listarSolicitudesPorEmergencia,
  actualizarEstadoSolicitud,
} from '../services/solicitudService';
import {
  registrarSalida,
  registrarStock,
  listarMovimientos,
  registrarEntrada,
} from '../services/movimientoService';

// Colores del badge según el estado de una solicitud
const BADGE_SOL = {
  pendiente: 'bg-tertiary/10 text-tertiary',
  aprobada:  'bg-secondary/10 text-secondary',
  rechazada: 'bg-error-container text-on-error-container',
};

// Opciones disponibles para categorizar el tipo de ítem que sale del inventario
const TIPO_ITEM_OPTS = [
  { value: 'herramienta', label: 'Herramienta', icon: <FaWrench className="text-xs" /> },
  { value: 'epp',         label: 'EPP',         icon: <FaHardHat className="text-xs" /> },
  { value: 'material',    label: 'Material',    icon: <FaBoxes className="text-xs" /> },
  { value: 'otro',        label: 'Otro',        icon: <MdInventory className="text-xs" /> },
];

// Colores del badge de tipo según la categoría del ítem
const TIPO_COLORS = {
  herramienta: 'bg-primary/10 text-primary',
  epp:         'bg-tertiary/10 text-tertiary',
  material:    'bg-tertiary/10 text-tertiary',
  otro:        'bg-surface-container text-on-surface',
};

// Estado inicial vacío del formulario de salida (se reutiliza al limpiar el form)
const formVacio = {
  nombre_item: '',
  cantidad: 1,
  persona_recibe: '',
  motivo: '',
  obra_descripcion: '',
  tipo_item: 'herramienta',
  emergencia_id: '',
  observaciones: '',
};

// Clase reutilizable para los inputs del formulario
const estiloInput = 'w-full border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

export default function GestionInventario() {
  // Datos del inventario general (totales + resumen por cuadrilla)
  const [inventario, setInventario] = useState(null);
  const [cargandoInv, setCargandoInv] = useState(true);

  // Emergencias activas disponibles para filtrar solicitudes y movimientos
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');

  // Solicitudes de herramientas/EPP enviadas por jefes de cuadrilla
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSol, setCargandoSol] = useState(false);
  // Texto de respuesta que escribe el coordinador antes de aprobar/rechazar
  const [respuestaTexto, setRespuestaTexto] = useState({});
  // Guarda el id de la solicitud que se está procesando para deshabilitar sus botones
  const [guardando, setGuardando] = useState(null);

  // Lista de movimientos (salidas y entradas) del inventario
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMov, setCargandoMov] = useState(false);
  // Controla si el modal de "Registrar salida" está abierto
  const [mostrarFormSalida, setMostrarFormSalida] = useState(false);
  // Datos del formulario de salida
  const [form, setForm] = useState(formVacio);
  // Evita doble submit mientras se guarda la salida
  const [enviando, setEnviando] = useState(false);
  // Guarda el id del movimiento que se está marcando como devuelto
  const [devolviendo, setDevolviendo] = useState(null);
  // Observaciones de devolución por id de movimiento (objeto { [id]: texto })
  const [obsDevolucion, setObsDevolucion] = useState({});
  // Filtro activo en la tabla: todos / activo / devuelto
  const [filtroMov, setFiltroMov] = useState('todos');
  // Filtro por categoría de ítem (vacío = todos los tipos)
  const [filtroCat, setFiltroCat] = useState('');

  // Notificación temporal que aparece arriba al completar una acción
  const [toast, setToast] = useState(null);

  // Ref para hacer scroll a la sección de solicitudes desde el banner de alertas
  const refSolicitudes = useRef(null);
  // Contadores animados — cuentan de 0 al valor real cuando carga el inventario
  const [contadores, setContadores] = useState({ total: 0, disponibles: 0, activos: 0, buenas: 0, danadas: 0, perdidas: 0 });

  // Tab del inventario inferior: 'movimientos' muestra salidas/entradas del almacén, 'cuadrilla' muestra por equipo
  const [tabInventario, setTabInventario] = useState('movimientos');
  // Muestra u oculta las entradas de stock en la tabla de movimientos
  const [mostrarStock, setMostrarStock] = useState(false);
  // Modal para registrar nueva entrada de stock al almacén
  const [mostrarFormStock, setMostrarFormStock] = useState(false);
  const [formStock, setFormStock] = useState({ nombre_item: '', cantidad: 1, tipo_item: 'herramienta', observaciones: '' });
  const [enviandoStock, setEnviandoStock] = useState(false);

  // Muestra una notificación verde o roja por 4 segundos y luego la borra
  const mostrarToast = (tipo, texto) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };

  // Al montar la página: carga el inventario y la lista de emergencias activas
  useEffect(() => {
    cargarInventario();
    obtenerEmergencias()
      .then((res) => {
        const lista = res.datos?.emergencias || res.datos || [];
        const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
        setEmergencias(activas);
        // Selecciona automáticamente la primera emergencia activa
        if (activas.length > 0) setEmergenciaId(String(activas[0].id));
      })
      .catch(() => {});
  }, []);

  // Cada vez que cambia la emergencia seleccionada recarga solicitudes y movimientos
  useEffect(() => {
    if (!emergenciaId) return;
    cargarSolicitudes();
    cargarMovimientos();
  }, [emergenciaId]);

  // Anima los números de las tarjetas cuando el inventario carga o los movimientos cambian
  useEffect(() => {
    if (!inventario) return;
    const activos = movimientos.filter((m) => m.estado === 'activo').reduce((s, m) => s + (Number(m.cantidad) || 1), 0);
    const targets = {
      total:       inventario.totales?.total ?? 0,
      disponibles: Math.max(0, (inventario.totales?.buenas ?? 0) - activos),
      activos,
      buenas:      inventario.totales?.buenas ?? 0,
      danadas:     inventario.totales?.danadas ?? 0,
      perdidas:    (inventario.totales?.perdidas ?? 0) + (inventario.totales?.no_devueltas ?? 0),
    };
    const dur = 700;
    const t0 = performance.now();
    const animar = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setContadores({
        total:       Math.round(ease * targets.total),
        disponibles: Math.round(ease * targets.disponibles),
        activos:     Math.round(ease * targets.activos),
        buenas:      Math.round(ease * targets.buenas),
        danadas:     Math.round(ease * targets.danadas),
        perdidas:    Math.round(ease * targets.perdidas),
      });
      if (p < 1) requestAnimationFrame(animar);
    };
    requestAnimationFrame(animar);
  }, [inventario, movimientos]);

  // Trae el resumen general del inventario (totales + desglose por cuadrilla)
  const cargarInventario = async () => {
    setCargandoInv(true);
    try {
      const res = await obtenerInventarioTotal();
      setInventario(res.datos || null);
    } catch {
      mostrarToast('error', 'Error al cargar el inventario');
    } finally {
      setCargandoInv(false);
    }
  };

  // Carga las solicitudes de herramientas/EPP de la emergencia actualmente seleccionada
  const cargarSolicitudes = async () => {
    if (!emergenciaId) return;
    setCargandoSol(true);
    try {
      const res = await listarSolicitudesPorEmergencia(emergenciaId);
      setSolicitudes(res.datos?.solicitudes || []);
    } catch {
      setSolicitudes([]);
    } finally {
      setCargandoSol(false);
    }
  };

  // Carga los movimientos (salidas y devoluciones) filtrando por emergencia si aplica
  // useCallback evita que esta función se recree innecesariamente al re-renderizar
  const cargarMovimientos = useCallback(async () => {
    setCargandoMov(true);
    try {
      const res = await listarMovimientos(emergenciaId || null);
      setMovimientos(res.datos?.movimientos || []);
    } catch {
      setMovimientos([]);
    } finally {
      setCargandoMov(false);
    }
  }, [emergenciaId]);

  // Aprueba o rechaza una solicitud y actualiza la lista automáticamente
  const handleResolver = async (id, estado) => {
    setGuardando(id);
    try {
      await actualizarEstadoSolicitud(id, estado, respuestaTexto[id] || null);
      mostrarToast('exito', `Solicitud ${estado === 'aprobada' ? 'aprobada' : 'rechazada'}`);
      await cargarSolicitudes();
    } catch {
      mostrarToast('error', 'Error al actualizar la solicitud');
    } finally {
      setGuardando(null);
    }
  };

  // Registra que un ítem salió del inventario: quién lo lleva, para qué obra, motivo, etc.
  const handleRegistrarSalida = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const payload = {
        ...form,
        // Si hay una emergencia seleccionada en el selector del header, se asocia automáticamente
        emergencia_id: emergenciaId || form.emergencia_id || null,
      };
      await registrarSalida(payload);
      mostrarToast('exito', `Salida registrada — ${form.nombre_item} para ${form.persona_recibe}`);
      setForm(formVacio);
      setMostrarFormSalida(false);
      cargarMovimientos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.mensaje || err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Marca un ítem como devuelto: registra la fecha de entrada y guarda las observaciones si las hay
  const handleEntrada = async (id) => {
    setDevolviendo(id);
    try {
      await registrarEntrada(id, obsDevolucion[id] || null);
      mostrarToast('exito', 'Entrada registrada — ítem marcado como devuelto');
      // Limpia el texto de observación de este movimiento ya que ya fue procesado
      setObsDevolucion((prev) => { const n = { ...prev }; delete n[id]; return n; });
      cargarMovimientos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.mensaje || err.message);
    } finally {
      setDevolviendo(null);
    }
  };

  // Registra nueva mercancía que entra al almacén de TECHO
  const handleRegistrarStock = async (e) => {
    e.preventDefault();
    setEnviandoStock(true);
    try {
      await registrarStock(formStock);
      mostrarToast('exito', `Stock registrado — ${formStock.cantidad} × ${formStock.nombre_item}`);
      setFormStock({ nombre_item: '', cantidad: 1, tipo_item: 'herramienta', observaciones: '' });
      setMostrarFormStock(false);
      cargarMovimientos();
    } catch (err) {
      mostrarToast('error', err.response?.data?.mensaje || err.message);
    } finally {
      setEnviandoStock(false);
    }
  };

  // Separa las solicitudes según si ya fueron resueltas o todavía están pendientes
  const solicitudesPendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const solicitudesResueltas  = solicitudes.filter((s) => s.estado !== 'pendiente');

  // Aplica los filtros activos a la lista de movimientos para mostrar solo los relevantes
  const movsFiltrados = movimientos.filter((m) => {
    // Las entradas de stock se ocultan por defecto; se muestran cuando el toggle está activo
    if (!mostrarStock && m.tipo_movimiento === 'entrada_stock') return false;
    if (mostrarStock && filtroMov !== 'todos') return false; // con stock activado no filtrar por estado
    if (!mostrarStock && filtroMov !== 'todos' && m.estado !== filtroMov) return false;
    if (filtroCat && m.tipo_item !== filtroCat) return false;
    return true;
  });

  // Cuántos ítems (unidades) están actualmente fuera sin devolución
  const activosCount = movimientos
    .filter((m) => m.estado === 'activo')
    .reduce((sum, m) => sum + (Number(m.cantidad) || 1), 0);

  // Agrupa los movimientos activos por nombre de ítem para mostrar qué y cuánto está fuera
  const itemsFuera = Object.values(
    movimientos
      .filter((m) => m.estado === 'activo')
      .reduce((acc, m) => {
        const key = m.nombre_item.toLowerCase();
        if (!acc[key]) {
          acc[key] = {
            nombre: m.nombre_item,
            tipo: m.tipo_item,
            cantidad: 0,
            personas: [],
          };
        }
        acc[key].cantidad += Number(m.cantidad) || 1;
        if (!acc[key].personas.includes(m.persona_recibe)) {
          acc[key].personas.push(m.persona_recibe);
        }
        return acc;
      }, {})
  ).sort((a, b) => b.cantidad - a.cantidad);

  // Disponibles = herramientas en buen estado − las que están fuera en préstamo
  // Es una estimación razonable ya que los préstamos suelen ser de ítems en buen estado
  const disponibles = Math.max(0, (inventario?.totales?.buenas ?? 0) - activosCount);

  return (
    <div className="min-h-screen bg-surface-container-low">
      <Navbar />

      <div className="pt-[60px]">
        {/* Barra superior con título y selector de emergencia */}
        <div className="bg-primary shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
            <MdInventory className="text-primary text-2xl flex-shrink-0" />
            <h1 className="text-white font-bold text-lg tracking-tight">Inventario General</h1>
            <div className="ml-auto flex items-center gap-2">
              <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
              <select
                value={emergenciaId}
                onChange={(e) => setEmergenciaId(e.target.value)}
                className="bg-white/10 text-white border border-white/25 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
              >
                {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
                {emergencias.map((e) => (
                  <option key={e.id} value={e.id} className="text-on-surface bg-white">{e.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notificación temporal (éxito o error) que aparece flotando arriba */}
        {toast && (
          <div className={`fixed top-[122px] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold animate-fadeIn ${
            toast.tipo === 'exito' ? 'bg-secondary text-white' : 'bg-error text-white'
          }`}>
            {toast.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
            {toast.texto}
          </div>
        )}

        {/* Banner de urgencia — aparece solo cuando hay solicitudes sin revisar */}
        {solicitudesPendientes.length > 0 && (
          <div className="bg-tertiary/5 border-b-2 border-tertiary/40 px-5 py-3 flex items-center gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-xl bg-tertiary-container flex items-center justify-center flex-shrink-0 shadow-sm">
              <MdWarning className="text-white text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-tertiary text-sm leading-tight">
                {solicitudesPendientes.length} solicitud{solicitudesPendientes.length > 1 ? 'es' : ''} pendiente{solicitudesPendientes.length > 1 ? 's' : ''} de revisión
              </p>
              <p className="text-tertiary text-xs mt-0.5">Los jefes de cuadrilla están esperando tu respuesta</p>
            </div>
            <button
              onClick={() => refSolicitudes.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-tertiary-container hover:bg-tertiary/50 text-tertiary rounded-xl text-xs font-bold transition"
            >
              Ver ahora <MdArrowDownward className="text-sm" />
            </button>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">

          {/* ── Sección 1: Resumen del inventario total ─────────────────── */}
          {cargandoInv ? (
            <div className="flex items-center justify-center py-16 gap-2.5 text-outline">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando inventario...</span>
            </div>
          ) : inventario ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">1</span>
                <h2 className="text-sm font-bold text-on-surface">Resumen del inventario</h2>
              </div>
              {/* Tarjetas de totales con contadores animados */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Total registrado',   valor: contadores.total,       top: 'border-t-primary',   num: 'text-primary',   sub: 'ítems en el sistema' },
                  { label: 'Disponibles',        valor: contadores.disponibles, top: 'border-t-secondary',   num: 'text-secondary',   sub: 'listos para usar' },
                  { label: 'En préstamo',        valor: contadores.activos,     top: activosCount > 0 ? 'border-t-red-500' : 'border-t-gray-300', num: activosCount > 0 ? 'text-error' : 'text-outline', sub: activosCount > 0 ? 'unidades fuera ahora' : 'nada fuera' },
                  { label: 'Buen estado',        valor: contadores.buenas,      top: 'border-t-emerald-500',     num: 'text-secondary',     sub: 'sin daños reportados' },
                  { label: 'Dañadas',            valor: contadores.danadas,     top: 'border-t-orange-400',      num: 'text-tertiary',      sub: 'requieren revisión' },
                  { label: 'Pérdidas / No dev.', valor: contadores.perdidas,    top: 'border-t-red-500',         num: 'text-on-error-container',         sub: 'no recuperadas' },
                ].map(({ label, valor, top, num, sub }, i) => (
                  <div key={label} style={{ animationDelay: `${i * 50}ms` }}
                    className={`animate-fadeInUp bg-white border border-outline-variant/60 border-t-[3px] ${top} rounded-xl p-4 flex flex-col gap-0.5 shadow-card hover:shadow-card-hover transition-shadow`}>
                    <span className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider leading-snug">{label}</span>
                    <span className={`text-3xl font-black tabular-nums leading-tight ${num}`}>{valor}</span>
                    <span className="text-outline text-[10px] mt-0.5">{sub}</span>
                  </div>
                ))}
              </div>

              {/* Mini-tabla de ítems actualmente fuera (solo aparece cuando hay préstamos activos) */}
              {itemsFuera.length > 0 && (
                <div className="bg-error-container/40 border border-error/30 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-error/30 bg-error-container/60">
                    <MdArrowUpward className="text-error" />
                    <span className="font-semibold text-on-error-container text-sm">Ítems actualmente fuera del inventario</span>
                    <span className="ml-auto px-2 py-0.5 bg-error-container/400 text-white text-xs font-bold rounded-full">{itemsFuera.length} tipo{itemsFuera.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {itemsFuera.map((item) => (
                      <div key={item.nombre} className="flex items-center gap-2 bg-white border border-error/30 rounded-xl px-3 py-2 shadow-sm">
                        {/* Badge de categoría */}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${TIPO_COLORS[item.tipo] || TIPO_COLORS.otro}`}>
                          {TIPO_ITEM_OPTS.find((t) => t.value === item.tipo)?.label || item.tipo}
                        </span>
                        <span className="font-semibold text-on-surface text-sm">{item.nombre}</span>
                        {/* Cuántas unidades están fuera */}
                        <span className="px-2 py-0.5 bg-error-container text-on-error-container rounded-full text-xs font-bold">{item.cantidad} fuera</span>
                        {/* Quién los tiene */}
                        <span className="text-outline text-xs">→ {item.personas.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}

          {/* ── Sección 2: Vista unificada — Movimientos del almacén + Por cuadrilla ── */}
          <div className="bg-white rounded-xl border border-outline-variant/60 overflow-hidden">
            {/* Cabecera con tabs y botones de acción */}
            <div className="bg-primary/5 border-b border-outline-variant/60 px-4 py-3 flex flex-wrap items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">2</span>
              {/* Tabs de vista */}
              <div className="flex rounded-xl overflow-hidden border border-outline-variant">
                <button
                  onClick={() => setTabInventario('movimientos')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${
                    tabInventario === 'movimientos' ? 'bg-primary text-white' : 'bg-white text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <MdArrowUpward className="text-[11px]" />
                  <MdArrowDownward className="text-[11px] -ml-1.5" />
                  Almacén
                  {activosCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-error-container/400 text-white text-[10px] font-bold rounded-full">{activosCount}</span>
                  )}
                </button>
                <button
                  onClick={() => setTabInventario('cuadrilla')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition border-l border-outline-variant ${
                    tabInventario === 'cuadrilla' ? 'bg-primary text-white' : 'bg-white text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <MdGroups className="text-sm" />
                  Por cuadrilla
                </button>
              </div>
              {/* Botones de acción — solo en tab almacén */}
              {tabInventario === 'movimientos' && (
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setMostrarFormStock(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <MdPlaylistAdd className="text-base" /> Registrar stock
                  </button>
                  <button
                    onClick={() => setMostrarFormSalida(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-dark transition"
                  >
                    <MdAdd /> Registrar salida
                  </button>
                </div>
              )}
            </div>

            {/* ── Tab: Por cuadrilla ── */}
            {tabInventario === 'cuadrilla' && (
              <div>
                {!inventario?.resumen?.length ? (
                  <div className="flex flex-col items-center justify-center py-14 text-outline">
                    <MdGroups className="text-5xl mb-3 opacity-20" />
                    <p className="text-sm text-on-surface-variant">No hay herramientas registradas por cuadrilla</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant/60 bg-surface-container-low">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Cuadrilla</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Total</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-secondary uppercase">Buenas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-tertiary uppercase">Dañadas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-error uppercase">Perdidas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-tertiary uppercase">No dev.</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventario.resumen.map((fila) => (
                          <tr key={fila.cuadrilla_id} className={`border-b border-outline-variant/60 hover:bg-surface-container-low transition ${fila.con_diferencias ? 'bg-error-container/40/60' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${fila.con_diferencias ? 'bg-error' : 'bg-secondary'}`} />
                                <span className="font-medium text-on-surface">{fila.cuadrilla_nombre}</span>
                              </div>
                            </td>
                            <td className="text-center px-3 py-3 font-bold tabular-nums text-primary">{fila.total}</td>
                            <td className="text-center px-3 py-3 text-secondary font-semibold tabular-nums">{fila.buenas}</td>
                            <td className="text-center px-3 py-3 text-tertiary font-semibold tabular-nums">{fila.danadas}</td>
                            <td className="text-center px-3 py-3 text-on-error-container font-semibold tabular-nums">{fila.perdidas}</td>
                            <td className="text-center px-3 py-3 text-tertiary font-semibold tabular-nums">{fila.no_devueltas}</td>
                            <td className="text-center px-3 py-3">
                              {fila.con_diferencias ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-error-container text-on-error-container rounded-full text-xs font-bold"><MdWarning /> Alerta</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-bold"><MdCheckCircle /> OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-primary/5 border-t-2 border-primary/20">
                          <td className="px-4 py-2.5 text-xs font-bold text-primary uppercase">Total general</td>
                          <td className="text-center px-3 py-2.5 font-bold text-primary">{inventario.totales?.total ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-secondary">{inventario.totales?.buenas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-tertiary">{inventario.totales?.danadas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-on-error-container">{inventario.totales?.perdidas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-tertiary">{inventario.totales?.no_devueltas ?? 0}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Almacén (movimientos) — visible solo cuando el tab activo es movimientos ── */}
            {tabInventario === 'movimientos' && <>

            {/* Filtros para ver solo "Fuera", "Devuelto" o un tipo específico */}
            <div className="px-4 py-2.5 border-b border-outline-variant/60 flex flex-wrap items-center gap-2">
              <span className="text-xs text-on-surface-variant font-medium">Estado:</span>
              {!mostrarStock && [['todos', 'Todos'], ['activo', 'Fuera'], ['devuelto', 'Devuelto']].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setFiltroMov(val)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    filtroMov === val
                      ? val === 'activo' ? 'bg-error-container/400 text-white border-error'
                        : val === 'devuelto' ? 'bg-secondary text-white border-secondary'
                        : 'bg-primary text-white border-primary'
                      : 'bg-white text-on-surface-variant border-outline-variant hover:border-outline'
                  }`}
                >
                  {lbl}
                </button>
              ))}
              <button
                onClick={() => { setMostrarStock(!mostrarStock); setFiltroMov('todos'); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  mostrarStock ? 'bg-secondary text-white border-secondary' : 'bg-white text-on-surface-variant border-outline-variant hover:border-secondary/50'
                }`}
              >
                {mostrarStock ? '✓ Stock entrante' : '+ Ver stock'}
              </button>
              <div className="w-px h-4 bg-surface-container-highest mx-0.5" />
              <span className="text-xs text-on-surface-variant font-medium">Tipo:</span>
              <button
                onClick={() => setFiltroCat('')}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${!filtroCat ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline-variant hover:border-outline'}`}
              >
                Todos
              </button>
              {TIPO_ITEM_OPTS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFiltroCat(t.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${filtroCat === t.value ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline-variant hover:border-outline'}`}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={cargarMovimientos}
                className="ml-auto flex items-center gap-1 px-3 py-1 bg-white border border-outline-variant rounded-lg text-xs text-on-surface-variant hover:text-primary hover:border-primary transition"
              >
                <MdRefresh />
              </button>
            </div>

            {/* Tabla de movimientos con columnas de fecha, persona, motivo y acción de devolución */}
            <div className="overflow-x-auto">
              {cargandoMov ? (
                <div className="flex items-center justify-center py-12 gap-2 text-outline">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Cargando movimientos...</span>
                </div>
              ) : movsFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-outline">
                  <MdInfo className="text-4xl mb-2 opacity-20" />
                  <p className="text-sm text-on-surface-variant">
                    {movimientos.length === 0 ? 'No hay movimientos registrados aún' : 'Sin resultados para este filtro'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/60 bg-surface-container-low">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Ítem</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Cant.</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Persona</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Motivo / Obra</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Salida</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Entrada</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                      <th className="px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movsFiltrados.map((m) => (
                      <tr key={m.id} className={`border-b border-outline-variant/60 hover:bg-surface-container-low transition ${
                        m.tipo_movimiento === 'entrada_stock' ? 'bg-secondary/5/40' : m.estado === 'activo' ? 'bg-error-container/40/30' : ''
                      }`}>
                        {/* Nombre del ítem con badge de categoría y chip verde para entradas de stock */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {m.tipo_movimiento === 'entrada_stock' && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-secondary/10 text-secondary border border-secondary/30">STOCK +</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TIPO_COLORS[m.tipo_item] || TIPO_COLORS.otro}`}>
                              {TIPO_ITEM_OPTS.find((t) => t.value === m.tipo_item)?.label || m.tipo_item}
                            </span>
                            <span className="font-medium text-on-surface">{m.nombre_item}</span>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 font-bold tabular-nums text-primary">{m.cantidad}</td>
                        {/* Persona que retiró el ítem */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 text-xs text-on-surface">
                            <MdPerson className="text-primary flex-shrink-0" />
                            {m.persona_recibe}
                          </div>
                        </td>
                        {/* Motivo del retiro y obra asociada (si la hay) */}
                        <td className="px-3 py-3 max-w-[180px]">
                          <p className="text-xs text-on-surface truncate">{m.motivo}</p>
                          {m.obra_descripcion && (
                            <div className="flex items-center gap-1 text-[10px] text-outline mt-0.5">
                              <MdLocationOn className="flex-shrink-0" />
                              <span className="truncate">{m.obra_descripcion}</span>
                            </div>
                          )}
                        </td>
                        {/* Fecha y hora en que salió el ítem */}
                        <td className="px-3 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <MdArrowUpward className="text-error text-xs" />
                            {new Date(m.fecha_salida).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        {/* Fecha de devolución, o guión si todavía no fue devuelto */}
                        <td className="px-3 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                          {m.fecha_entrada ? (
                            <div className="flex items-center gap-1">
                              <MdArrowDownward className="text-secondary text-xs" />
                              {new Date(m.fecha_entrada).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <span className="text-outline-variant">—</span>
                          )}
                        </td>
                        {/* Badge de estado: "Fuera" (rojo) o "Devuelto" (verde) */}
                        <td className="text-center px-3 py-3">
                          {m.estado === 'activo' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-error-container text-on-error-container rounded-full text-xs font-bold">
                              <MdArrowUpward className="text-[10px]" /> Fuera
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-bold">
                              <MdCheckCircle className="text-[10px]" /> Devuelto
                            </span>
                          )}
                        </td>
                        {/* Solo muestra el botón de devolución si el ítem todavía está fuera */}
                        <td className="px-3 py-3">
                          {m.estado === 'activo' && (
                            <div className="flex flex-col gap-1 min-w-[130px]">
                              <input
                                type="text"
                                placeholder="Obs. devolución (opc.)"
                                value={obsDevolucion[m.id] || ''}
                                onChange={(e) => setObsDevolucion((prev) => ({ ...prev, [m.id]: e.target.value }))}
                                className="border border-outline-variant rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary w-full"
                              />
                              <button
                                onClick={() => handleEntrada(m.id)}
                                disabled={devolviendo === m.id}
                                className="flex items-center justify-center gap-1 py-1 bg-secondary text-white text-[11px] font-bold rounded-lg hover:bg-secondary/90 transition disabled:opacity-60"
                              >
                                <MdArrowDownward className="text-xs" />
                                {devolviendo === m.id ? 'Registrando...' : 'Registrar entrada'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </>}
          </div>

          {/* ── Sección 3: Solicitudes enviadas por jefes de cuadrilla ──── */}
          {/* El coordinador puede aprobar o rechazar cada solicitud desde aquí */}
          <div ref={refSolicitudes} className="bg-white rounded-xl border border-outline-variant/60 overflow-hidden scroll-mt-20">
            <div className="bg-primary/5 border-b border-outline-variant/60 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">3</span>
                <MdWarning className="text-tertiary" />
                <h2 className="font-semibold text-on-surface text-sm">
                  Solicitudes de jefes de cuadrilla
                  {/* Badge rojo si hay solicitudes sin resolver */}
                  {solicitudesPendientes.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-tertiary text-white text-xs font-bold rounded-full">
                      {solicitudesPendientes.length} pendiente{solicitudesPendientes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </h2>
              </div>
              <button onClick={cargarSolicitudes} className="flex items-center gap-1 px-3 py-1 bg-white border border-outline-variant rounded-lg text-xs text-on-surface-variant hover:text-primary hover:border-primary transition">
                <MdFilterList /> Actualizar
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {cargandoSol ? (
                <div className="flex items-center justify-center py-8 gap-2 text-outline">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Cargando solicitudes...</span>
                </div>
              ) : !emergenciaId ? (
                <p className="text-outline text-sm text-center py-6">Selecciona una emergencia para ver sus solicitudes</p>
              ) : solicitudes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-outline">
                  <MdCheckCircle className="text-4xl mb-2 opacity-30" />
                  <p className="text-sm text-on-surface-variant">No hay solicitudes para esta emergencia</p>
                </div>
              ) : (
                <>
                  {/* Solicitudes pendientes: el coordinador puede aprobar o rechazar */}
                  {solicitudesPendientes.map((s) => (
                    <div key={s.id} className="border border-tertiary/30 bg-tertiary/5/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.tipo === 'epp' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'}`}>
                          {s.tipo === 'epp' ? 'EPP' : (s.tipo || 'Herramienta')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary">Pendiente</span>
                        {s.nombre_item && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                            "{s.nombre_item}" ×{s.cantidad || 1}
                          </span>
                        )}
                        <p className="text-on-surface text-sm w-full">{s.descripcion}</p>
                        {s.nombre_item && (
                          <p className="text-[10px] text-secondary font-medium w-full">
                            ✓ Al aprobar: se registrará automáticamente la salida del inventario
                          </p>
                        )}
                      </div>
                      {/* Respuesta opcional que el coordinador puede escribir antes de resolver */}
                      <input
                        type="text"
                        placeholder="Respuesta al jefe (opcional)"
                        value={respuestaTexto[s.id] || ''}
                        onChange={(e) => setRespuestaTexto((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        className="border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleResolver(s.id, 'aprobada')} disabled={guardando === s.id}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-secondary text-white text-xs font-bold rounded-lg hover:bg-secondary/90 transition disabled:opacity-60">
                          <MdThumbUp /> Aprobar
                        </button>
                        <button onClick={() => handleResolver(s.id, 'rechazada')} disabled={guardando === s.id}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 transition disabled:opacity-60">
                          <MdThumbDown /> Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Historial de solicitudes ya resueltas (más compacto, solo lectura) */}
                  {solicitudesResueltas.length > 0 && (
                    <div className="mt-2">
                      {solicitudesResueltas.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-outline-variant/60 last:border-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.tipo === 'epp' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'}`}>
                              {s.tipo === 'epp' ? 'EPP' : 'Herramienta'}
                            </span>
                            <span className="text-on-surface text-xs">{s.descripcion}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${BADGE_SOL[s.estado]}`}>
                            {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante de acción principal — siempre visible al hacer scroll */}
      {/* Modal: registrar entrada de stock al almacén */}
      {mostrarFormStock && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <MdPlaylistAdd className="text-secondary text-xl" />
                <div>
                  <h2 className="font-bold text-on-surface text-sm leading-tight">Registrar entrada de stock</h2>
                  <p className="text-xs text-outline mt-0.5">Nuevos ítems que ingresan al almacén de TECHO</p>
                </div>
              </div>
              <button onClick={() => setMostrarFormStock(false)} className="text-outline hover:text-on-surface-variant transition ml-2">
                <MdClose className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleRegistrarStock} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {TIPO_ITEM_OPTS.map((t) => (
                  <label key={t.value} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer text-xs font-semibold transition ${
                    formStock.tipo_item === t.value ? 'border-secondary bg-secondary/5 text-secondary' : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                  }`}>
                    <input type="radio" className="sr-only" checked={formStock.tipo_item === t.value} onChange={() => setFormStock({ ...formStock, tipo_item: t.value })} />
                    {t.icon} {t.label}
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Nombre del ítem</label>
                <input
                  required
                  className={estiloInput}
                  placeholder="Ej: Casco de seguridad, Martillo…"
                  value={formStock.nombre_item}
                  onChange={(e) => setFormStock({ ...formStock, nombre_item: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Cantidad</label>
                <input
                  type="number" min={1} max={9999}
                  required
                  className={estiloInput}
                  value={formStock.cantidad}
                  onChange={(e) => setFormStock({ ...formStock, cantidad: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Observaciones</label>
                <textarea
                  className={`${estiloInput} resize-none`}
                  rows={2}
                  placeholder="Ej: Lote comprado para emergencia norte…"
                  value={formStock.observaciones}
                  onChange={(e) => setFormStock({ ...formStock, observaciones: e.target.value })}
                />
              </div>
              <button type="submit" disabled={enviandoStock} className="w-full py-2.5 bg-secondary hover:bg-secondary/90 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
                <MdPlaylistAdd className="text-lg" /> {enviandoStock ? 'Registrando…' : 'Añadir al inventario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {!mostrarFormSalida && !mostrarFormStock && tabInventario === 'movimientos' && (
        <button
          onClick={() => setMostrarFormSalida(true)}
          className="fixed bottom-6 right-6 z-[400] flex items-center gap-2.5 px-5 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm active:scale-95"
        >
          <MdAdd className="text-xl" /> Registrar salida
        </button>
      )}

      {/* ── Modal: formulario para registrar que algo salió del inventario ── */}
      {mostrarFormSalida && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <MdArrowUpward className="text-error text-xl" />
                <div>
                  <h2 className="font-bold text-on-surface text-sm">Registrar salida</h2>
                  <p className="text-xs text-outline mt-0.5">Especifica qué sale, para quién, por qué y para qué obra</p>
                </div>
              </div>
              <button onClick={() => setMostrarFormSalida(false)} className="text-outline hover:text-on-surface-variant transition">
                <MdClose className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleRegistrarSalida} className="p-5 overflow-y-auto flex flex-col gap-4">
              {/* Selector visual del tipo de ítem (herramienta, EPP, material u otro) */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Tipo de ítem</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIPO_ITEM_OPTS.map((t) => (
                    <label
                      key={t.value}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 cursor-pointer text-xs font-semibold transition ${
                        form.tipo_item === t.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                      }`}
                    >
                      {/* Radio oculto visualmente, se maneja con el onClick del label */}
                      <input type="radio" className="sr-only" value={t.value} checked={form.tipo_item === t.value} onChange={() => setForm({ ...form, tipo_item: t.value })} />
                      {t.icon}
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Nombre del ítem (campo principal) y cantidad en la misma fila */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Nombre del ítem <span className="text-error">*</span></label>
                  <input
                    required
                    className={estiloInput}
                    placeholder='Ej: Martillo, Casco, Clavo 3"'
                    value={form.nombre_item}
                    onChange={(e) => setForm({ ...form, nombre_item: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Cantidad <span className="text-error">*</span></label>
                  <input
                    required
                    type="number"
                    min="1"
                    className={estiloInput}
                    value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                  />
                </div>
              </div>

              {/* Quién se lleva el ítem (nombre de la persona, no solo un usuario del sistema) */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  <span className="flex items-center gap-1"><MdPerson className="text-primary" /> Para quién <span className="text-error">*</span></span>
                </label>
                <input
                  required
                  className={estiloInput}
                  placeholder="Nombre completo de quien recibe"
                  value={form.persona_recibe}
                  onChange={(e) => setForm({ ...form, persona_recibe: e.target.value })}
                />
              </div>

              {/* Por qué sale este ítem del inventario */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Motivo <span className="text-error">*</span></label>
                <input
                  required
                  className={estiloInput}
                  placeholder="Ej: Trabajo de instalación de techo, medición inicial..."
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                />
              </div>

              {/* Dónde específicamente se usará el ítem (para poder rastrearlo) */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  <span className="flex items-center gap-1"><MdLocationOn className="text-primary" /> Obra / Ubicación específica <span className="text-error">*</span></span>
                </label>
                <input
                  required
                  className={estiloInput}
                  placeholder="Ej: Casa familia Pérez — Calle Los Aromos 123"
                  value={form.obra_descripcion}
                  onChange={(e) => setForm({ ...form, obra_descripcion: e.target.value })}
                />
              </div>

              {/* Observaciones opcionales: estado del ítem al salir, notas de mantenimiento, etc. */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Observaciones (opcional)</label>
                <input
                  className={estiloInput}
                  placeholder="Estado del ítem al salir, notas adicionales..."
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setForm(formVacio); setMostrarFormSalida(false); }}
                  className="flex-1 py-2.5 border border-outline-variant rounded-xl text-sm text-on-surface-variant font-semibold hover:bg-surface-container-low transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-error-container/400 text-white rounded-xl hover:bg-error/90 transition text-sm font-semibold disabled:opacity-60"
                >
                  <MdArrowUpward /> {enviando ? 'Registrando...' : 'Registrar salida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
