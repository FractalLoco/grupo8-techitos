import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdInventory, MdBuild, MdWarning, MdCheckCircle, MdFilterList, MdError,
  MdClose, MdThumbUp, MdThumbDown, MdArrowUpward, MdArrowDownward, MdPerson,
  MdLocationOn, MdAdd, MdRefresh, MdInfo, MdPlaylistAdd, MdGroups, MdSearch,
} from 'react-icons/md';
import { FaWrench, FaHardHat, FaBoxes } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { obtenerInventarioTotal } from '../services/herramientaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import { listarSolicitudesPorEmergencia, actualizarEstadoSolicitud } from '../services/solicitudService';
import { registrarSalida, registrarStock, listarMovimientos, registrarEntrada } from '../services/movimientoService';

const BADGE_SOL = {
  pendiente: 'badge-yellow',
  aprobada: 'badge-green',
  rechazada: 'badge bg-red-50 text-[#E94362]',
};

const TIPO_ITEM_OPTS = [
  { value: 'herramienta', label: 'Herramienta', icon: <FaWrench className="text-xs" /> },
  { value: 'epp', label: 'EPP', icon: <FaHardHat className="text-xs" /> },
  { value: 'material', label: 'Material', icon: <FaBoxes className="text-xs" /> },
  { value: 'otro', label: 'Otro', icon: <MdInventory className="text-xs" /> },
];

const TIPO_COLORS = {
  herramienta: 'bg-primary/10 text-primary',
  epp: 'bg-amber-50 text-[#835100]',
  material: 'bg-amber-50 text-[#835100]',
  otro: 'bg-gray-100 text-[#6F7882]',
};

const formVacio = {
  nombre_item: '', cantidad: 1, persona_recibe: '', motivo: '',
  obra_descripcion: '', tipo_item: 'herramienta', emergencia_id: '', observaciones: '',
};

export default function GestionInventario() {
  const [inventario, setInventario] = useState(null);
  const [cargandoInv, setCargandoInv] = useState(true);
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSol, setCargandoSol] = useState(false);
  const [respuestaTexto, setRespuestaTexto] = useState({});
  const [guardando, setGuardando] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMov, setCargandoMov] = useState(false);
  const [mostrarFormSalida, setMostrarFormSalida] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [enviando, setEnviando] = useState(false);
  const [devolviendo, setDevolviendo] = useState(null);
  const [obsDevolucion, setObsDevolucion] = useState({});
  const [filtroMov, setFiltroMov] = useState('todos');
  const [filtroCat, setFiltroCat] = useState('');
  const [toast, setToast] = useState(null);
  const refSolicitudes = useRef(null);
  const [contadores, setContadores] = useState({ total: 0, disponibles: 0, activos: 0, buenas: 0, danadas: 0, perdidas: 0 });
  const [tabInventario, setTabInventario] = useState('movimientos');
  const [mostrarStock, setMostrarStock] = useState(false);
  const [mostrarFormStock, setMostrarFormStock] = useState(false);
  const [formStock, setFormStock] = useState({ nombre_item: '', cantidad: 1, tipo_item: 'herramienta', observaciones: '' });
  const [enviandoStock, setEnviandoStock] = useState(false);

  const mostrarToast = (tipo, texto) => { setToast({ tipo, texto }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    cargarInventario();
    obtenerEmergencias().then((res) => {
      const lista = res.datos?.emergencias || res.datos || [];
      const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
      setEmergencias(activas);
      if (activas.length > 0) setEmergenciaId(String(activas[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => { if (!emergenciaId) return; cargarSolicitudes(); cargarMovimientos(); }, [emergenciaId]);

  useEffect(() => {
    if (!inventario) return;
    const activos = movimientos.filter((m) => m.estado === 'activo').reduce((s, m) => s + (Number(m.cantidad) || 1), 0);
    const targets = {
      total: inventario.totales?.total ?? 0,
      disponibles: Math.max(0, (inventario.totales?.buenas ?? 0) - activos),
      activos, buenas: inventario.totales?.buenas ?? 0,
      danadas: inventario.totales?.danadas ?? 0,
      perdidas: (inventario.totales?.perdidas ?? 0) + (inventario.totales?.no_devueltas ?? 0),
    };
    const dur = 700, t0 = performance.now();
    const animar = (t) => {
      const p = Math.min((t - t0) / dur, 1), ease = 1 - Math.pow(1 - p, 3);
      setContadores({
        total: Math.round(ease * targets.total), disponibles: Math.round(ease * targets.disponibles),
        activos: Math.round(ease * targets.activos), buenas: Math.round(ease * targets.buenas),
        danadas: Math.round(ease * targets.danadas), perdidas: Math.round(ease * targets.perdidas),
      });
      if (p < 1) requestAnimationFrame(animar);
    };
    requestAnimationFrame(animar);
  }, [inventario, movimientos]);

  const cargarInventario = async () => {
    setCargandoInv(true);
    try { const res = await obtenerInventarioTotal(); setInventario(res.datos || null); }
    catch { mostrarToast('error', 'Error al cargar inventario'); }
    finally { setCargandoInv(false); }
  };

  const cargarSolicitudes = async () => {
    if (!emergenciaId) return;
    setCargandoSol(true);
    try { const res = await listarSolicitudesPorEmergencia(emergenciaId); setSolicitudes(res.datos?.solicitudes || []); }
    catch { setSolicitudes([]); }
    finally { setCargandoSol(false); }
  };

  const cargarMovimientos = useCallback(async () => {
    setCargandoMov(true);
    try { const res = await listarMovimientos(emergenciaId || null); setMovimientos(res.datos?.movimientos || []); }
    catch { setMovimientos([]); }
    finally { setCargandoMov(false); }
  }, [emergenciaId]);

  const handleResolver = async (id, estado) => {
    setGuardando(id);
    try {
      await actualizarEstadoSolicitud(id, estado, respuestaTexto[id] || null);
      mostrarToast('exito', `Solicitud ${estado === 'aprobada' ? 'aprobada' : 'rechazada'}`);
      await cargarSolicitudes();
    } catch (err) { mostrarToast('error', err.response?.data?.mensaje || err.message || 'Error al actualizar solicitud'); }
    finally { setGuardando(null); }
  };

  const handleRegistrarSalida = async (e) => {
    e.preventDefault(); setEnviando(true);
    try {
      await registrarSalida({ ...form, emergencia_id: emergenciaId || form.emergencia_id || null });
      mostrarToast('exito', `Salida registrada — ${form.nombre_item} para ${form.persona_recibe}`);
      setForm(formVacio); setMostrarFormSalida(false); cargarMovimientos();
    } catch (err) { mostrarToast('error', err.response?.data?.mensaje || err.message); }
    finally { setEnviando(false); }
  };

  const handleEntrada = async (id) => {
    setDevolviendo(id);
    try {
      await registrarEntrada(id, obsDevolucion[id] || null);
      mostrarToast('exito', 'Entrada registrada');
      setObsDevolucion((prev) => { const n = { ...prev }; delete n[id]; return n; });
      cargarMovimientos();
    } catch (err) { mostrarToast('error', err.response?.data?.mensaje || err.message); }
    finally { setDevolviendo(null); }
  };

  const handleRegistrarStock = async (e) => {
    e.preventDefault(); setEnviandoStock(true);
    try {
      await registrarStock(formStock);
      mostrarToast('exito', `Stock registrado — ${formStock.cantidad} x ${formStock.nombre_item}`);
      setFormStock({ nombre_item: '', cantidad: 1, tipo_item: 'herramienta', observaciones: '' });
      setMostrarFormStock(false); cargarMovimientos();
    } catch (err) { mostrarToast('error', err.response?.data?.mensaje || err.message); }
    finally { setEnviandoStock(false); }
  };

  const solicitudesPendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const solicitudesResueltas = solicitudes.filter((s) => s.estado !== 'pendiente');
  const movsFiltrados = movimientos.filter((m) => {
    if (!mostrarStock && m.tipo_movimiento === 'entrada_stock') return false;
    if (mostrarStock && filtroMov !== 'todos') return false;
    if (!mostrarStock && filtroMov !== 'todos' && m.estado !== filtroMov) return false;
    if (filtroCat && m.tipo_item !== filtroCat) return false;
    return true;
  });

  const activosCount = movimientos.filter((m) => m.estado === 'activo').reduce((sum, m) => sum + (Number(m.cantidad) || 1), 0);

  const itemsFuera = Object.values(
    movimientos.filter((m) => m.estado === 'activo').reduce((acc, m) => {
      const key = m.nombre_item.toLowerCase();
      if (!acc[key]) acc[key] = { nombre: m.nombre_item, tipo: m.tipo_item, cantidad: 0, personas: [] };
      acc[key].cantidad += Number(m.cantidad) || 1;
      if (!acc[key].personas.includes(m.persona_recibe)) acc[key].personas.push(m.persona_recibe);
      return acc;
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="page-header">
          <div className="page-header-content">
            <MdInventory className="page-header-icon" />
            <h1 className="page-header-title">Inventario General</h1>
            <div className="ml-auto flex items-center gap-2">
              <label className="text-white/50 text-xs font-medium whitespace-nowrap">Emergencia</label>
              <select value={emergenciaId} onChange={(e) => setEmergenciaId(e.target.value)} className="page-select">
                {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
                {emergencias.map((e) => (<option key={e.id} value={e.id} className="text-on-surface bg-white">{e.nombre}</option>))}
              </select>
            </div>
          </div>
        </div>

        {toast && <div className={`toast-${toast.tipo === 'exito' ? 'success' : 'error'}`}>{toast.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}{toast.texto}</div>}

        {solicitudesPendientes.length > 0 && (
          <div className="bg-amber-50 border-b-2 border-[#835100]/40 px-5 py-3 flex items-center gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-xl bg-[#835100] flex items-center justify-center flex-shrink-0 shadow-sm">
              <MdWarning className="text-white text-xl" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#835100] text-sm">{solicitudesPendientes.length} solicitud{solicitudesPendientes.length > 1 ? 'es' : ''} pendiente{solicitudesPendientes.length > 1 ? 's' : ''} de revisión</p>
              <p className="text-[#835100] text-xs mt-0.5">Los jefes de cuadrilla están esperando tu respuesta</p>
            </div>
            <button onClick={() => refSolicitudes.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#835100] text-white rounded-xl text-xs font-bold hover:bg-[#634000] transition">
              Ver ahora <MdArrowDownward className="text-sm" />
            </button>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-4">
          {cargandoInv ? (
            <div className="flex items-center justify-center py-16 gap-2.5 text-outline">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando inventario...</span>
            </div>
          ) : inventario ? (
            <div className="flex flex-col gap-4">
              <div className="section-header">
                <span className="section-number">1</span>
                <h2 className="section-title">Resumen del inventario</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Total registrado', valor: contadores.total, color: 'text-primary', sub: 'ítems en el sistema', bar: 'border-t-primary' },
                  { label: 'Disponibles', valor: contadores.disponibles, color: 'text-[#006D37]', sub: 'listos para usar', bar: 'border-t-[#006D37]' },
                  { label: 'En préstamo', valor: contadores.activos, color: activosCount > 0 ? 'text-[#E94362]' : 'text-outline', sub: activosCount > 0 ? 'unidades fuera ahora' : 'nada fuera', bar: activosCount > 0 ? 'border-t-[#E94362]' : 'border-t-gray-300' },
                  { label: 'Buen estado', valor: contadores.buenas, color: 'text-[#006D37]', sub: 'sin daños reportados', bar: 'border-t-[#006D37]' },
                  { label: 'Dañadas', valor: contadores.danadas, color: 'text-[#835100]', sub: 'requieren revisión', bar: 'border-t-[#835100]' },
                  { label: 'Pérdidas / No dev.', valor: contadores.perdidas, color: 'text-[#E94362]', sub: 'no recuperadas', bar: 'border-t-[#E94362]' },
                ].map(({ label, valor, color, sub, bar }, i) => (
                  <div key={label} style={{ animationDelay: `${i * 50}ms` }} className={`stat-card border-t-[3px] ${bar} animate-fadeInUp`}>
                    <span className="stat-label">{label}</span>
                    <span className={`stat-value ${color}`}>{valor}</span>
                    <span className="stat-sub">{sub}</span>
                  </div>
                ))}
              </div>

              {itemsFuera.length > 0 && (
                <div className="bg-red-50 border border-[#E94362]/30 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#E94362]/30 bg-red-50/60">
                    <MdArrowUpward className="text-[#E94362]" />
                    <span className="font-semibold text-[#BA1A1A] text-sm">Ítems actualmente fuera del inventario</span>
                    <span className="ml-auto badge-red">{itemsFuera.length} tipo{itemsFuera.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {itemsFuera.map((item) => (
                      <div key={item.nombre} className="flex items-center gap-2 bg-white border border-[#E94362]/30 rounded-xl px-3 py-2 shadow-sm">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${TIPO_COLORS[item.tipo] || TIPO_COLORS.otro}`}>{TIPO_ITEM_OPTS.find((t) => t.value === item.tipo)?.label || item.tipo}</span>
                        <span className="font-semibold text-on-surface text-sm">{item.nombre}</span>
                        <span className="px-2 py-0.5 bg-red-50 text-[#E94362] rounded-full text-xs font-bold">{item.cantidad} fuera</span>
                        <span className="text-outline text-xs">→ {item.personas.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="card overflow-hidden">
            <div className="bg-primary-50 border-b border-outline-variant/60 px-4 py-3 flex flex-wrap items-center gap-2">
              <span className="section-number">2</span>
              <div className="flex rounded-xl overflow-hidden border border-outline-variant">
                <button onClick={() => setTabInventario('movimientos')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition ${tabInventario === 'movimientos' ? 'bg-primary text-white' : 'bg-white text-on-surface-variant hover:bg-surface-container-low'}`}>
                  <MdArrowUpward className="text-[11px]" /><MdArrowDownward className="text-[11px] -ml-1.5" />
                  Almacén
                  {activosCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-[#E94362] text-white text-[10px] font-bold rounded-full">{activosCount}</span>}
                </button>
                <button onClick={() => setTabInventario('cuadrilla')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition border-l border-outline-variant ${tabInventario === 'cuadrilla' ? 'bg-primary text-white' : 'bg-white text-on-surface-variant hover:bg-surface-container-low'}`}>
                  <MdGroups className="text-sm" /> Por cuadrilla
                </button>
              </div>
              {tabInventario === 'movimientos' && (
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setMostrarFormStock(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006D37] hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition">
                    <MdPlaylistAdd className="text-base" /> Registrar stock
                  </button>
                  <button onClick={() => setMostrarFormSalida(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-dark transition">
                    <MdAdd /> Registrar salida
                  </button>
                </div>
              )}
            </div>

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
                          <th className="table-header">Cuadrilla</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Total</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#006D37] uppercase">Buenas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#835100] uppercase">Dañadas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#E94362] uppercase">Perdidas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#835100] uppercase">No dev.</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventario.resumen.map((fila) => (
                          <tr key={fila.cuadrilla_id} className={`table-row ${fila.con_diferencias ? 'bg-red-50/60' : ''}`}>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${fila.con_diferencias ? 'bg-[#E94362]' : 'bg-[#006D37]'}`} />
                                <span className="font-medium text-on-surface">{fila.cuadrilla_nombre}</span>
                              </div>
                            </td>
                            <td className="text-center px-3 py-3 font-bold tabular-nums text-primary">{fila.total}</td>
                            <td className="text-center px-3 py-3 text-[#006D37] font-semibold tabular-nums">{fila.buenas}</td>
                            <td className="text-center px-3 py-3 text-[#835100] font-semibold tabular-nums">{fila.danadas}</td>
                            <td className="text-center px-3 py-3 text-[#E94362] font-semibold tabular-nums">{fila.perdidas}</td>
                            <td className="text-center px-3 py-3 text-[#835100] font-semibold tabular-nums">{fila.no_devueltas}</td>
                            <td className="text-center px-3 py-3">
                              {fila.con_diferencias ? (
                                <span className="badge-red"><MdWarning /> Alerta</span>
                              ) : (
                                <span className="badge-green"><MdCheckCircle /> OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-primary/5 border-t-2 border-primary/20">
                          <td className="px-4 py-2.5 text-xs font-bold text-primary uppercase">Total general</td>
                          <td className="text-center px-3 py-2.5 font-bold text-primary">{inventario.totales?.total ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-[#006D37]">{inventario.totales?.buenas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-[#835100]">{inventario.totales?.danadas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-[#E94362]">{inventario.totales?.perdidas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-[#835100]">{inventario.totales?.no_devueltas ?? 0}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tabInventario === 'movimientos' && <>
              <div className="px-4 py-2.5 border-b border-outline-variant/60 flex flex-wrap items-center gap-2">
                <span className="text-xs text-on-surface-variant font-medium">Estado:</span>
                {!mostrarStock && [['todos', 'Todos'], ['activo', 'Fuera'], ['devuelto', 'Devuelto']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setFiltroMov(val)}
                    className={`filter-btn ${filtroMov === val ? 'filter-btn-active' : 'filter-btn-inactive'}`}>{lbl}</button>
                ))}
                <button onClick={() => { setMostrarStock(!mostrarStock); setFiltroMov('todos'); }}
                  className={`filter-btn ${mostrarStock ? 'bg-[#006D37] text-white border-[#006D37]' : 'filter-btn-inactive'}`}>
                  {mostrarStock ? '✓ Stock entrante' : '+ Ver stock'}
                </button>
                <div className="w-px h-4 bg-surface-container-highest mx-0.5" />
                <span className="text-xs text-on-surface-variant font-medium">Tipo:</span>
                <button onClick={() => setFiltroCat('')} className={`filter-btn ${!filtroCat ? 'filter-btn-active' : 'filter-btn-inactive'}`}>Todos</button>
                {TIPO_ITEM_OPTS.map((t) => (
                  <button key={t.value} onClick={() => setFiltroCat(t.value)} className={`filter-btn ${filtroCat === t.value ? 'filter-btn-active' : 'filter-btn-inactive'}`}>{t.label}</button>
                ))}
                <button onClick={cargarMovimientos} className="ml-auto flex items-center gap-1 px-3 py-1 bg-white border border-outline-variant rounded-lg text-xs text-on-surface-variant hover:text-primary hover:border-primary transition"><MdRefresh /></button>
              </div>

              <div className="overflow-x-auto">
                {cargandoMov ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-outline">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Cargando movimientos...</span>
                  </div>
                ) : movsFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-outline">
                    <MdInfo className="text-4xl mb-2 opacity-20" />
                    <p className="text-sm text-on-surface-variant">{movimientos.length === 0 ? 'No hay movimientos registrados aún' : 'Sin resultados para este filtro'}</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/60 bg-surface-container-low">
                        <th className="table-header">Ítem</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Cant.</th>
                        <th className="table-header">Persona</th>
                        <th className="table-header">Motivo / Obra</th>
                        <th className="table-header">Salida</th>
                        <th className="table-header">Entrada</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Estado</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {movsFiltrados.map((m) => (
                        <tr key={m.id} className={`table-row ${m.tipo_movimiento === 'entrada_stock' ? 'bg-green-50/40' : m.estado === 'activo' ? 'bg-red-50/30' : ''}`}>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              {m.tipo_movimiento === 'entrada_stock' && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-[#006D37] border border-[#006D37]/30">STOCK +</span>}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TIPO_COLORS[m.tipo_item] || TIPO_COLORS.otro}`}>{TIPO_ITEM_OPTS.find((t) => t.value === m.tipo_item)?.label || m.tipo_item}</span>
                              <span className="font-medium text-on-surface">{m.nombre_item}</span>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3 font-bold tabular-nums text-primary">{m.cantidad}</td>
                          <td className="px-3 py-3"><div className="flex items-center gap-1 text-xs text-on-surface"><MdPerson className="text-primary flex-shrink-0" />{m.persona_recibe}</div></td>
                          <td className="px-3 py-3 max-w-[180px]">
                            <p className="text-xs text-on-surface truncate">{m.motivo}</p>
                            {m.obra_descripcion && <div className="flex items-center gap-1 text-[10px] text-outline mt-0.5"><MdLocationOn className="flex-shrink-0" /><span className="truncate">{m.obra_descripcion}</span></div>}
                          </td>
                          <td className="px-3 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                            <div className="flex items-center gap-1"><MdArrowUpward className="text-[#E94362] text-xs" />{new Date(m.fecha_salida).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-3 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                            {m.fecha_entrada ? (
                              <div className="flex items-center gap-1"><MdArrowDownward className="text-[#006D37] text-xs" />{new Date(m.fecha_entrada).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            ) : <span className="text-outline-variant">—</span>}
                          </td>
                          <td className="text-center px-3 py-3">
                            {m.estado === 'activo' ? (
                              <span className="badge-red"><MdArrowUpward className="text-[10px]" /> Fuera</span>
                            ) : (
                              <span className="badge-green"><MdCheckCircle className="text-[10px]" /> Devuelto</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {m.estado === 'activo' && (
                              <div className="flex flex-col gap-1 min-w-[130px]">
                                <input type="text" placeholder="Obs. devolución (opc.)" value={obsDevolucion[m.id] || ''} onChange={(e) => setObsDevolucion((prev) => ({ ...prev, [m.id]: e.target.value }))} className="border border-outline-variant rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary w-full" />
                                <button onClick={() => handleEntrada(m.id)} disabled={devolviendo === m.id} className="flex items-center justify-center gap-1 py-1 bg-[#006D37] text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-60">
                                  <MdArrowDownward className="text-xs" />{devolviendo === m.id ? 'Registrando...' : 'Registrar entrada'}
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

          <div ref={refSolicitudes} className="card overflow-hidden scroll-mt-20">
            <div className="bg-primary-50 border-b border-outline-variant/60 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="section-number">3</span>
                <MdWarning className="text-[#835100]" />
                <h2 className="font-semibold text-on-surface text-sm">
                  Solicitudes de jefes de cuadrilla
                  {solicitudesPendientes.length > 0 && <span className="ml-2 badge-red">{solicitudesPendientes.length} pendiente{solicitudesPendientes.length > 1 ? 's' : ''}</span>}
                </h2>
              </div>
              <button onClick={cargarSolicitudes} className="flex items-center gap-1 px-3 py-1 bg-white border border-outline-variant rounded-lg text-xs text-on-surface-variant hover:text-primary hover:border-primary transition"><MdFilterList /> Actualizar</button>
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
                  {solicitudesPendientes.map((s) => (
                    <div key={s.id} className="border border-[#835100]/30 bg-amber-50/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.tipo === 'epp' ? 'bg-amber-50 text-[#835100]' : 'bg-primary/10 text-primary'}`}>{s.tipo === 'epp' ? 'EPP' : (s.tipo || 'Herramienta')}</span>
                        <span className="badge-yellow">Pendiente</span>
                        {s.nombre_item && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">"{s.nombre_item}" ×{s.cantidad || 1}</span>}
                        <p className="text-on-surface text-sm w-full">{s.descripcion}</p>
                        {s.nombre_item && <p className="text-[10px] text-[#006D37] font-medium w-full">✓ Al aprobar: se registrará automáticamente la salida del inventario</p>}
                      </div>
                      <input type="text" placeholder="Respuesta al jefe (opcional)" value={respuestaTexto[s.id] || ''} onChange={(e) => setRespuestaTexto((prev) => ({ ...prev, [s.id]: e.target.value }))} className="input-field" />
                      <div className="flex gap-2">
                        <button onClick={() => handleResolver(s.id, 'aprobada')} disabled={guardando === s.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#006D37] text-white text-xs font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-60"><MdThumbUp /> Aprobar</button>
                        <button onClick={() => handleResolver(s.id, 'rechazada')} disabled={guardando === s.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#E94362] text-white text-xs font-bold rounded-lg hover:bg-[#BA1A1A] transition disabled:opacity-60"><MdThumbDown /> Rechazar</button>
                      </div>
                    </div>
                  ))}
                  {solicitudesResueltas.length > 0 && (
                    <div className="mt-2">
                      {solicitudesResueltas.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-outline-variant/60 last:border-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.tipo === 'epp' ? 'bg-amber-50 text-[#835100]' : 'bg-primary/10 text-primary'}`}>{s.tipo === 'epp' ? 'EPP' : 'Herramienta'}</span>
                            <span className="text-on-surface text-xs">{s.descripcion}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${BADGE_SOL[s.estado]}`}>{s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}</span>
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

      {mostrarFormStock && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMostrarFormStock(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <MdPlaylistAdd className="text-[#006D37] text-xl" />
                <div>
                  <h2 className="font-bold text-on-surface text-sm leading-tight">Registrar entrada de stock</h2>
                  <p className="text-xs text-outline mt-0.5">Nuevos ítems que ingresan al almacén de TECHO</p>
                </div>
              </div>
              <button onClick={() => setMostrarFormStock(false)} className="text-outline hover:text-on-surface-variant ml-2"><MdClose className="text-xl" /></button>
            </div>
            <form onSubmit={handleRegistrarStock} className="modal-body flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2">
                {TIPO_ITEM_OPTS.map((t) => (
                  <label key={t.value} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer text-xs font-semibold transition ${formStock.tipo_item === t.value ? 'border-[#006D37] bg-green-50 text-[#006D37]' : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                    <input type="radio" className="sr-only" checked={formStock.tipo_item === t.value} onChange={() => setFormStock({ ...formStock, tipo_item: t.value })} />
                    {t.icon} {t.label}
                  </label>
                ))}
              </div>
              <div>
                <label className="label">Nombre del ítem</label>
                <input required className="input-field" placeholder="Ej: Casco de seguridad, Martillo…" value={formStock.nombre_item} onChange={(e) => setFormStock({ ...formStock, nombre_item: e.target.value })} />
              </div>
              <div>
                <label className="label">Cantidad</label>
                <input type="number" min={1} max={9999} required className="input-field" value={formStock.cantidad} onChange={(e) => setFormStock({ ...formStock, cantidad: e.target.value })} />
              </div>
              <div>
                <label className="label">Observaciones</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Ej: Lote comprado para emergencia norte…" value={formStock.observaciones} onChange={(e) => setFormStock({ ...formStock, observaciones: e.target.value })} />
              </div>
              <button type="submit" disabled={enviandoStock} className="btn-success">{enviandoStock ? 'Registrando...' : 'Registrar stock'}</button>
            </form>
          </div>
        </div>
      )}

      {mostrarFormSalida && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMostrarFormSalida(false); }}>
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <MdAdd className="text-primary text-xl" />
                <div>
                  <h2 className="font-bold text-on-surface text-sm leading-tight">Registrar salida de inventario</h2>
                  <p className="text-xs text-outline mt-0.5">Registra qué ítem sale, quién lo recibe y para qué</p>
                </div>
              </div>
              <button onClick={() => setMostrarFormSalida(false)} className="text-outline hover:text-on-surface-variant ml-2"><MdClose className="text-xl" /></button>
            </div>
            <form onSubmit={handleRegistrarSalida} className="modal-body flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="label">Tipo de ítem</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPO_ITEM_OPTS.map((t) => (
                    <label key={t.value} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer text-xs font-semibold transition ${form.tipo_item === t.value ? 'border-primary bg-primary-50 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                      <input type="radio" className="sr-only" checked={form.tipo_item === t.value} onChange={() => setForm({ ...form, tipo_item: t.value })} />
                      {t.icon} {t.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Nombre del ítem <span className="text-error">*</span></label>
                <input required className="input-field" placeholder="Ej: Martillo, Casco, Pala…" value={form.nombre_item} onChange={(e) => setForm({ ...form, nombre_item: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cantidad</label>
                  <input type="number" min={1} required className="input-field" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                </div>
                <div>
                  <label className="label">Persona que recibe <span className="text-error">*</span></label>
                  <input required className="input-field" placeholder="Nombre" value={form.persona_recibe} onChange={(e) => setForm({ ...form, persona_recibe: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Motivo de la salida</label>
                <input className="input-field" placeholder="Ej: Para obra de techado sector norte" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
              </div>
              <div>
                <label className="label">Descripción de la obra / destino</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Dirección o referencia de la obra" value={form.obra_descripcion} onChange={(e) => setForm({ ...form, obra_descripcion: e.target.value })} />
              </div>
              <div>
                <label className="label">Observaciones</label>
                <input className="input-field" placeholder="Notas adicionales" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
              </div>
              <button type="submit" disabled={enviando} className="btn-primary">{enviando ? 'Registrando...' : 'Registrar salida'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
