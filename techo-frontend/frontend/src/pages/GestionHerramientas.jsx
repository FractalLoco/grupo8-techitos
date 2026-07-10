import { useState, useEffect } from 'react';
import {
  MdBuild, MdInventory, MdAddCircle, MdCheckCircle, MdError, MdWarning,
  MdClose, MdSave, MdFilterList, MdReport, MdOutlineRequestPage,
  MdExpandMore, MdExpandLess, MdAssignmentReturn,
} from 'react-icons/md';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import {
  listarHerramientas, registrarHerramienta, registrarHerramientasMasivas, actualizarEstadoHerramienta,
  obtenerCatalogoInventario,
} from '../services/herramientaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import { obtenerUsuarios } from '../services/usuarioService';
import { listarCuadrillas, listarTodasLasCuadrillasConEstado, obtenerBalanceHerramientas, cerrarBalanceDia, devolverHerramientas } from '../services/cuadrillaService';
import { crearSolicitud, listarSolicitudesPorCuadrilla } from '../services/solicitudService';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import Input from '../components/ui/Input';

const ESTILOS_ESTADO = {
  entregada:   { borde: 'border-primary',       badge: 'badge-blue',     punto: 'bg-primary',     etiqueta: 'Entregada' },
  buena:       { borde: 'border-[#006D37]',     badge: 'badge-green',    punto: 'bg-[#006D37]',   etiqueta: 'Buena' },
  danada:      { borde: 'border-[#835100]',     badge: 'badge-yellow',   punto: 'bg-[#835100]',   etiqueta: 'Dañada' },
  perdida:     { borde: 'border-[#E94362]',     badge: 'badge-red',      punto: 'bg-[#E94362]',   etiqueta: 'Perdida' },
  no_devuelta: { borde: 'border-[#E94362]',     badge: 'badge-red',     punto: 'bg-[#E94362]',   etiqueta: 'No devuelta' },
};

const BALANCE_STATS = [
  { clave: 'entregadas',  etiqueta: 'Entregadas',   color: 'blue' },
  { clave: 'buenas',      etiqueta: 'Buenas',       color: 'success' },
  { clave: 'danadas',     etiqueta: 'Dañadas',      color: 'warning' },
  { clave: 'perdidas',    etiqueta: 'Perdidas',      color: 'error' },
  { clave: 'noDevueltas', etiqueta: 'No devueltas', color: 'error' },
];

export default function GestionHerramientas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';

  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [cuadrillaId, setCuadrillaId] = useState('');

  const [herramientas, setHerramientas] = useState([]);
  const [balance, setBalance] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modoRegistro, setModoRegistro] = useState('individual');
  const [nombreHerramienta, setNombreHerramienta] = useState('');
  const [nombresMultiples, setNombresMultiples] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [tabJefe, setTabJefe] = useState('mis-herramientas');
  const [herramientaReporte, setHerramientaReporte] = useState('');
  const [estadoReporte, setEstadoReporte] = useState('danada');
  const [obsReporte, setObsReporte] = useState('');

  const [tipoSolicitud, setTipoSolicitud] = useState('herramienta');
  const [nombreSolicitud, setNombreSolicitud] = useState('');
  const [cantidadSolicitud, setCantidadSolicitud] = useState(1);
  const [descSolicitud, setDescSolicitud] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSol, setCargandoSol] = useState(false);
  const [catalogo, setCatalogo] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [confirmar, setConfirmar] = useState({ abierto: false, titulo: '', mensaje: '', onConfirm: () => {} });
  const [terminadaExpandida, setTerminadaExpandida] = useState(null);
  const [herramientasTerminada, setHerramientasTerminada] = useState({});
  const [devolviendoId, setDevolviendoId] = useState(null);

  useEffect(() => {
    obtenerCatalogoInventario().then((res) => setCatalogo(res.datos?.catalogo || [])).catch(() => {});
    obtenerUsuarios().then((res) => setUsuarios(res.datos?.usuarios || res.datos || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await obtenerEmergencias();
        const lista = res.datos?.emergencias || res.datos || [];
        const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
        if (!activo) return;
        setEmergencias(activas);

        // El jefe no elige emergencia: se fija automáticamente la de su cuadrilla asignada.
        if (esJefe) {
          try {
            const resC = await listarTodasLasCuadrillasConEstado();
            const miCuadrilla = (resC.datos?.cuadrillas || []).find((c) => c.jefe_id === usuario?.id);
            if (activo && miCuadrilla?.emergencia_id) {
              setEmergenciaId(String(miCuadrilla.emergencia_id));
              return;
            }
          } catch { /* si falla, cae al comportamiento por defecto */ }
        }

        if (activo && activas.length > 0) setEmergenciaId(String(activas[0].id));
      } catch {
        if (activo) setError('No se pudieron cargar las emergencias');
      }
    })();
    return () => { activo = false; };
  }, [esJefe, usuario?.id]);

  useEffect(() => {
    if (!emergenciaId) return;
    listarCuadrillas(emergenciaId).then((res) => {
      const lista = res.datos?.cuadrillas || [];
      setCuadrillas(lista);
      if (esJefe) {
        const miCuadrilla = lista.find((c) => c.jefe_id === usuario?.id);
        setCuadrillaId(miCuadrilla ? String(miCuadrilla.id) : '');
      } else if (lista.length > 0) setCuadrillaId(String(lista[0].id));
    }).catch(() => setError('Error al cargar cuadrillas'));
  }, [emergenciaId, esJefe, usuario]);

  useEffect(() => { if (!cuadrillaId) return; cargarHerramientas(); cargarBalance(); }, [cuadrillaId]);

  useEffect(() => { if (esJefe && cuadrillaId && tabJefe === 'solicitar') cargarSolicitudes(); }, [tabJefe, cuadrillaId, esJefe]);

  const cargarHerramientas = async () => {
    setCargando(true);
    try { const res = await listarHerramientas(cuadrillaId); setHerramientas(res.datos?.herramientas || []); }
    catch { setError('Error al cargar herramientas'); }
    finally { setCargando(false); }
  };
  const cargarBalance = async () => { try { const res = await obtenerBalanceHerramientas(cuadrillaId); setBalance(res.datos?.balance || null); } catch { /* sin balance aún */ } };
  const cargarSolicitudes = async () => {
    setCargandoSol(true);
    try { const res = await listarSolicitudesPorCuadrilla(cuadrillaId); setSolicitudes(res.datos?.solicitudes || []); }
    catch { /* vacío */ }
    finally { setCargandoSol(false); }
  };
  const mostrarExito = (msg) => { setExito(msg); setTimeout(() => setExito(''), 3500); };

  const handleRegistrarIndividual = async () => {
    if (!nombreHerramienta.trim()) return;
    setGuardando(true);
    const res = await registrarHerramienta(cuadrillaId, nombreHerramienta.trim());
    setGuardando(false);
    if (res.estado === 'exitoso') { setNombreHerramienta(''); await cargarHerramientas(); await cargarBalance(); mostrarExito('Herramienta registrada'); }
    else { setError(res.mensaje || 'Error al registrar'); }
  };

  const handleRegistrarMasivo = async () => {
    const nombres = nombresMultiples.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    if (nombres.length === 0) return;
    setGuardando(true);
    const res = await registrarHerramientasMasivas(cuadrillaId, nombres);
    setGuardando(false);
    if (res.estado === 'exitoso') { setNombresMultiples(''); await cargarHerramientas(); await cargarBalance(); mostrarExito(`${nombres.length} herramientas registradas`); }
    else { setError(res.mensaje || 'Error al registrar'); }
  };

  const handleGuardarEstado = async (herramientaId) => {
    if (!nuevoEstado) return;
    setGuardando(true);
    const res = await actualizarEstadoHerramienta(herramientaId, nuevoEstado, observaciones);
    setGuardando(false);
    if (res.estado === 'exitoso') { setEditandoId(null); setNuevoEstado(''); setObservaciones(''); await cargarHerramientas(); await cargarBalance(); mostrarExito('Estado actualizado'); }
    else { setError(res.mensaje || 'Error al actualizar'); }
  };

  const handleCerrarBalance = async () => {
    setConfirmar({
      abierto: true,
      titulo: 'Cerrar balance del día',
      mensaje: '¿Cerrar el balance del día? Si hay herramientas dañadas o perdidas se activará una alerta al coordinador.',
      onConfirm: async () => {
        setConfirmar((c) => ({ ...c, abierto: false }));
        setGuardando(true);
        const res = await cerrarBalanceDia(cuadrillaId);
        setGuardando(false);
        if (res.estado === 'exitoso') { await cargarBalance(); mostrarExito('Balance cerrado. Alertas actualizadas.'); }
        else { setError(res.mensaje || 'Error al cerrar balance'); }
      },
    });
  };

  const handleReportarIncidente = async () => {
    if (!herramientaReporte) { setError('Selecciona una herramienta'); return; }
    setGuardando(true);
    const res = await actualizarEstadoHerramienta(herramientaReporte, estadoReporte, obsReporte);
    setGuardando(false);
    if (res.estado === 'exitoso') { setHerramientaReporte(''); setEstadoReporte('danada'); setObsReporte(''); await cargarHerramientas(); mostrarExito('Incidente reportado correctamente'); }
    else { setError(res.mensaje || 'Error al reportar'); }
  };

  const handleEnviarSolicitud = async () => {
    if (!nombreSolicitud.trim()) { setError('Selecciona un ítem del inventario'); return; }
    if (!emergenciaId || !cuadrillaId) { setError('Selecciona emergencia y cuadrilla'); return; }
    setGuardando(true);
    try {
      await crearSolicitud({
        cuadrillaId: parseInt(cuadrillaId), emergenciaId: parseInt(emergenciaId),
        tipo: tipoSolicitud, nombre_item: nombreSolicitud.trim(),
        cantidad: Number(cantidadSolicitud) || 1,
        descripcion: descSolicitud.trim() || `Solicitud de ${tipoSolicitud}: ${nombreSolicitud}`,
      });
      setNombreSolicitud(''); setCantidadSolicitud(1); setDescSolicitud('');
      await cargarSolicitudes(); mostrarExito('Solicitud enviada al coordinador');
    } catch { setError('Error al enviar solicitud'); }
    finally { setGuardando(false); }
  };

  const herramientasFiltradas = filtroEstado === 'todos' ? herramientas : herramientas.filter((h) => h.estado === filtroEstado);
  const cuadrillaActual = cuadrillas.find((c) => String(c.id) === cuadrillaId);
  const emergenciaActual = emergencias.find((e) => String(e.id) === String(emergenciaId));
  const cuadrillasTerminadas = cuadrillas.filter((c) => c.estado === 'completada' || c.estado === 'desarmada');

  const toggleTerminada = async (id) => {
    if (terminadaExpandida === id) { setTerminadaExpandida(null); return; }
    setTerminadaExpandida(id);
    if (!herramientasTerminada[id]) {
      try {
        const res = await listarHerramientas(id);
        setHerramientasTerminada((prev) => ({ ...prev, [id]: res.datos?.herramientas || [] }));
      } catch { setHerramientasTerminada((prev) => ({ ...prev, [id]: [] })); }
    }
  };

  const handleDevolverHerramientas = (cuadrilla) => {
    setConfirmar({
      abierto: true,
      titulo: 'Devolver herramientas al inventario',
      mensaje: `¿Devolver al inventario las herramientas reutilizables (en buen estado) de "${cuadrilla.nombre}"? Volverán como stock disponible y podrán reutilizarse. El historial se conserva.`,
      onConfirm: async () => {
        setConfirmar((c) => ({ ...c, abierto: false }));
        setDevolviendoId(cuadrilla.id);
        try {
          const res = await devolverHerramientas(cuadrilla.id);
          const total = res.datos?.totalDevuelto ?? 0;
          mostrarExito(`${total} herramienta(s) devuelta(s) al inventario`);
          // Refleja el cambio marcando la cuadrilla como devuelta y recargando cuadrillas
          const lista = await listarCuadrillas(emergenciaId);
          setCuadrillas(lista.datos?.cuadrillas || []);
        } catch (err) { setError(err.response?.data?.mensaje || err.message || 'Error al devolver herramientas'); }
        finally { setDevolviendoId(null); }
      },
    });
  };

  const Mensajes = () => (
    <>
      {error && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-red-50 border border-error/40 rounded-xl">
          <MdError className="text-error text-xl flex-shrink-0" />
          <p className="text-error text-sm flex-1">{error}</p>
          <button onClick={() => setError('')}><MdClose className="text-error/60" /></button>
        </div>
      )}
      {exito && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-green-50 border border-[#006D37]/40 rounded-xl">
          <MdCheckCircle className="text-[#006D37] text-xl flex-shrink-0" />
          <p className="text-[#006D37] text-sm">{exito}</p>
        </div>
      )}
    </>
  );

  const ListaHerramientas = ({ soloLectura = false }) => (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MdBuild className="text-primary" />
          <div>
            <h2 className="font-semibold text-on-surface text-sm leading-tight">{cuadrillaActual?.nombre || 'Mi cuadrilla'}</h2>
            {(() => {
              if (!cuadrillaActual?.jefe_id) return null;
              const jefe = usuarios.find((u) => String(u.id) === String(cuadrillaActual.jefe_id));
              return jefe ? <span className="text-[10px] text-outline block leading-tight mt-0.5">Jefe: {jefe.nombre}</span> : null;
            })()}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <MdFilterList className="text-outline text-base" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input-field py-1 text-xs"
          >
            <option value="todos">Todos</option>
            {Object.entries(ESTILOS_ESTADO).map(([val, { etiqueta }]) => (
              <option key={val} value={val}>{etiqueta}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-4">
        {cargando && (
          <div className="flex items-center justify-center py-10 text-outline gap-2.5">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        )}
        {!cargando && herramientasFiltradas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-outline">
            <MdBuild className="text-5xl mb-3 opacity-20" />
            <p className="text-sm font-medium text-on-surface-variant">No hay herramientas</p>
            <p className="text-xs text-outline mt-0.5">
              {filtroEstado === 'todos' ? 'Sin herramientas registradas aún.' : 'Sin herramientas con este estado.'}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {herramientasFiltradas.map((h, idx) => {
            const estilos = ESTILOS_ESTADO[h.estado] || ESTILOS_ESTADO.entregada;
            const estaEditando = !soloLectura && editandoId === h.id;
            return (
              <div key={h.id} style={{ animationDelay: `${idx * 40}ms` }} className={`animate-fadeInUp border-l-4 ${estilos.borde} bg-surface-container-low rounded-r-xl p-3 hover:-translate-y-px hover:shadow-sm transition-all duration-200`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-on-surface font-medium text-sm">{h.nombre}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={h.estado === 'buena' ? 'success' : h.estado === 'entregada' ? 'blue' : h.estado === 'danada' ? 'warning' : 'error'}>{estilos.etiqueta}</Badge>
                    {!soloLectura && (h.estado === 'entregada' || h.estado === 'buena') && (
                      <button
                        onClick={() => { setEditandoId(estaEditando ? null : h.id); setNuevoEstado('danada'); setObservaciones(''); }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-[#835100] rounded-lg text-xs font-semibold transition"
                      >
                        <MdWarning className="text-sm" /> Marcar daño
                      </button>
                    )}
                  </div>
                </div>
                {h.observaciones && <p className="text-xs text-outline mt-1.5 italic">Obs: {h.observaciones}</p>}
                {estaEditando && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-outline-variant flex flex-col gap-2">
                    <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} className="input-field">
                      <option value="buena">Buena — devuelta en buen estado</option>
                      <option value="danada">Dañada — presenta daños</option>
                      <option value="perdida">Perdida — no se encontró</option>
                      <option value="no_devuelta">No devuelta — pendiente</option>
                    </select>
                    <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones (opcional)" className="input-field" />
                    <div className="flex gap-2">
                      <button onClick={() => handleGuardarEstado(h.id)} disabled={guardando} className="btn-primary flex-1">
                        <MdSave /> Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)} className="flex-1 py-2 bg-surface-container text-on-surface-variant text-xs font-semibold rounded-xl hover:bg-surface-container-highest transition">Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="page-header">
          <div className="page-header-content">
            <MdBuild className="page-header-icon" />
            <h1 className="page-header-title">Control de Herramientas</h1>
            <div className="flex items-center gap-1.5">
              <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
              {esJefe ? (
                // El jefe no elige emergencia: se muestra la de su cuadrilla asignada como texto fijo.
                <span className="text-white text-sm font-semibold px-3 py-1.5 rounded-lg bg-white/10 whitespace-nowrap">
                  {emergenciaActual?.nombre || 'Tu emergencia asignada'}
                </span>
              ) : (
                <select
                  value={emergenciaId}
                  onChange={(e) => { setEmergenciaId(e.target.value); setCuadrillaId(''); setHerramientas([]); setBalance(null); }}
                  className="page-select"
                >
                  {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
                  {emergencias.map((e) => <option key={e.id} value={e.id} className="text-on-surface bg-white">{e.nombre}</option>)}
                </select>
              )}
            </div>
            {esCoordinador && (
              <div className="flex items-center gap-1.5">
                <label className="text-white/60 text-xs font-medium whitespace-nowrap">Cuadrilla</label>
                <select
                  value={cuadrillaId}
                  onChange={(e) => setCuadrillaId(e.target.value)}
                  className="page-select"
                >
                  {cuadrillas.length === 0 && <option value="">Sin cuadrillas</option>}
                  {cuadrillas.map((c) => <option key={c.id} value={c.id} className="text-on-surface bg-white">{c.nombre}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {esCoordinador && (
          <div className="max-w-5xl mx-auto px-4 py-6">
            <Mensajes />
            {cuadrillaId ? (
              <div className="flex gap-5 flex-wrap lg:flex-nowrap items-start">
                <div className="flex flex-col gap-5 w-full lg:w-72 flex-shrink-0">
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center gap-2">
                      <MdInventory className="text-primary text-lg" />
                      <h2 className="font-semibold text-on-surface text-sm">Balance del día</h2>
                    </div>
                    <div className="p-4">
                          {balance ? (
                        <>
                          {/* Barra visual de split */}
                          {(balance.total ?? 0) > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                                <span className="text-[#006D37] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#006D37]" />
                                  Devueltas ({balance.buenas})
                                </span>
                                <span className="text-[#E94362] flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E94362]" />
                                  Dañadas/Perdidas ({balance.danadas + balance.perdidas + balance.noDevueltas})
                                </span>
                              </div>
                              <div className="h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                                <div
                                  className="bg-[#006D37] h-full transition-all duration-500"
                                  style={{ width: `${((balance.buenas) / Math.max(balance.total, 1)) * 100}%` }}
                                />
                                {balance.danadas > 0 && (
                                  <div
                                    className="bg-[#835100] h-full transition-all duration-500"
                                    style={{ width: `${(balance.danadas / Math.max(balance.total, 1)) * 100}%` }}
                                  />
                                )}
                                <div
                                  className="bg-[#E94362] h-full transition-all duration-500"
                                  style={{ width: `${((balance.perdidas + balance.noDevueltas) / Math.max(balance.total, 1)) * 100}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-outline mt-1">
                                <span>Entregadas: {balance.entregadas}</span>
                                <span>Pendientes: {(balance.total ?? 0) - balance.buenas - balance.danadas - balance.perdidas - balance.noDevueltas}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5 mb-3">
                            {BALANCE_STATS.map(({ clave, etiqueta, color }) => (
                              <div key={clave} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${
                                color === 'blue' ? 'bg-blue-50' : color === 'success' ? 'bg-green-50' : color === 'warning' ? 'bg-amber-50' : 'bg-red-50'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                    color === 'blue' ? 'bg-primary' : color === 'success' ? 'bg-[#006D37]' : color === 'warning' ? 'bg-[#835100]' : 'bg-error'
                                  }`} />
                                  <span className="text-on-surface-variant text-xs">{etiqueta}</span>
                                </div>
                                <span className={`font-bold text-sm ${
                                  color === 'blue' ? 'text-primary' : color === 'success' ? 'text-[#006D37]' : color === 'warning' ? 'text-[#835100]' : 'text-error'
                                }`}>{balance[clave] ?? 0}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-outline-variant/60 pt-3 flex justify-between items-center px-1 mb-1">
                            <span className="text-xs text-outline font-medium">Total registradas</span>
                            <span className="text-primary font-bold text-base">{balance.total ?? 0}</span>
                          </div>
                          <button onClick={handleCerrarBalance} disabled={guardando} className="btn-primary w-full mt-3">
                            {guardando ? 'Cerrando...' : 'Cerrar balance del día'}
                          </button>
                        </>
                      ) : (
                        <p className="text-outline text-sm text-center py-4">Sin herramientas registradas aún.</p>
                      )}
                    </div>
                  </div>

                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center gap-2">
                      <MdAddCircle className="text-primary text-lg" />
                      <h2 className="font-semibold text-on-surface text-sm">Asignar herramientas</h2>
                    </div>
                    <div className="p-4">
                      <div className="flex gap-1 mb-3 bg-surface-container p-1 rounded-xl">
                        {['individual', 'masivo'].map((modo) => (
                          <button key={modo} onClick={() => setModoRegistro(modo)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                            modoRegistro === modo ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                          }`}>{modo}</button>
                        ))}
                      </div>
                      <div className="mb-3 flex items-center gap-1.5 text-[10px] text-outline bg-surface-container-low rounded-lg px-2 py-1.5">
                        <MdInventory className="text-primary text-xs" />
                        Solo se pueden asignar herramientas que existen en el <strong className="mx-1">Inventario</strong>
                      </div>
                      {modoRegistro === 'individual' ? (
                        <div className="flex flex-col gap-2">
                          <select value={nombreHerramienta} onChange={(e) => setNombreHerramienta(e.target.value)} className="input-field">
                            <option value="">— Selecciona del Inventario —</option>
                            {catalogo.filter((c) => c.tipo_item === 'herramienta' || c.tipo_item === 'epp').map((c) => {
                              const disp = c.disponible ?? Math.max(0, (c.buenas ?? 0) - (c.entregadas ?? 0));
                              return (
                                <option key={`${c.nombre}|${c.tipo_item}`} value={c.nombre}>
                                  {c.nombre} ({c.tipo_item}) — Disponible: {disp}
                                </option>
                              );
                            })}
                          </select>
                          <button onClick={handleRegistrarIndividual} disabled={guardando || !nombreHerramienta} className="w-full py-2 bg-[#006D37] text-white text-sm font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-60 flex items-center justify-center gap-1.5">
                            <MdAddCircle /> Asignar a cuadrilla
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="bg-amber-50 border border-[#835100]/30 rounded-xl px-3 py-2 text-[10px] text-[#835100]">
                            <strong>Modo masivo:</strong> los nombres deben coincidir exactamente con los del inventario.
                          </div>
                          <textarea value={nombresMultiples} onChange={(e) => setNombresMultiples(e.target.value)} rows={4} placeholder={"Un nombre por línea, tal cual en inventario:\nMartillo\nPala\nNivel de burbuja"} className="input-field resize-y" />
                          <button onClick={handleRegistrarMasivo} disabled={guardando} className="w-full py-2 bg-[#006D37] text-white text-sm font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-60 flex items-center justify-center gap-1.5">
                            <MdAddCircle /> {guardando ? 'Registrando...' : `Registrar ${nombresMultiples.split('\n').filter(Boolean).length} herramienta(s)`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <ListaHerramientas soloLectura={false} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-28 text-outline">
                <MdBuild className="text-7xl mb-4 opacity-20" />
                <p className="text-base font-medium text-on-surface-variant">Selecciona una emergencia y cuadrilla</p>
                <p className="text-sm text-outline mt-1">para ver y gestionar sus herramientas</p>
              </div>
            )}

            {cuadrillasTerminadas.length > 0 && (
              <div className="card overflow-hidden mt-6">
                <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center gap-2 bg-surface-container-low">
                  <MdCheckCircle className="text-outline text-lg" />
                  <div>
                    <h2 className="font-semibold text-on-surface text-sm">Obras terminadas</h2>
                    <p className="text-[10px] text-outline">Historial de herramientas · presiona "Devolución" para reingresarlas al inventario</p>
                  </div>
                  <span className="ml-auto text-xs text-outline">{cuadrillasTerminadas.length}</span>
                </div>
                <div className="divide-y divide-outline-variant/60">
                  {cuadrillasTerminadas.map((c) => {
                    const tools = herramientasTerminada[c.id] || [];
                    const expandida = terminadaExpandida === c.id;
                    return (
                      <div key={c.id} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <button onClick={() => toggleTerminada(c.id)} className="flex items-center gap-2 text-left min-w-0">
                            {expandida ? <MdExpandLess className="text-outline flex-shrink-0" /> : <MdExpandMore className="text-outline flex-shrink-0" />}
                            <span className="font-medium text-on-surface text-sm truncate">{c.nombre}</span>
                            <Badge color="gray">{c.estado === 'desarmada' ? 'Desarmada' : 'Completada'}</Badge>
                            {c.herramientas_devueltas && <Badge color="success">Devueltas</Badge>}
                          </button>
                          {c.herramientas_devueltas ? (
                            <span className="flex items-center gap-1 text-xs text-[#006D37] font-semibold flex-shrink-0"><MdCheckCircle className="text-sm" /> Devueltas al inventario</span>
                          ) : (
                            <button
                              onClick={() => handleDevolverHerramientas(c)}
                              disabled={devolviendoId === c.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006D37] text-white rounded-xl text-xs font-semibold hover:bg-green-700 transition disabled:opacity-60 flex-shrink-0"
                            >
                              <MdAssignmentReturn className="text-sm" /> {devolviendoId === c.id ? 'Devolviendo…' : 'Devolución'}
                            </button>
                          )}
                        </div>
                        {expandida && (
                          <div className="mt-3 pl-6">
                            {tools.length === 0 ? (
                              <p className="text-xs text-outline italic py-2">Sin herramientas registradas para esta obra</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {tools.map((h) => {
                                  const est = ESTILOS_ESTADO[h.estado] || ESTILOS_ESTADO.entregada;
                                  return (
                                    <div key={h.id} className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2.5 py-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full ${est.punto}`} />
                                      <span className="text-xs text-on-surface">{h.nombre}</span>
                                      <span className="text-[10px] text-outline">· {est.etiqueta}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {esJefe && (
          <>
            <div className="bg-white border-b border-outline-variant/60 shadow-sm">
              <div className="max-w-5xl mx-auto px-4 flex gap-1 pt-2">
                {[
                  { key: 'mis-herramientas', label: 'Mis herramientas', icon: <MdBuild className="text-base" /> },
                  { key: 'reportar', label: 'Reportar incidente', icon: <MdReport className="text-base" /> },
                  { key: 'solicitar', label: 'Solicitar herramienta / EPP', icon: <MdOutlineRequestPage className="text-base" /> },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setTabJefe(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
                      tabJefe === key ? 'border-primary text-primary bg-primary-50' : 'border-transparent text-outline hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
              <Mensajes />

              {tabJefe === 'mis-herramientas' && (
                cuadrillaId ? <ListaHerramientas soloLectura={true} /> : (
                  <div className="flex flex-col items-center justify-center py-28 text-outline">
                    <MdBuild className="text-7xl mb-4 opacity-20" />
                    <p className="text-base font-medium text-on-surface-variant">No tienes cuadrilla asignada</p>
                    <p className="text-sm text-outline mt-1">Selecciona una emergencia activa</p>
                  </div>
                )
              )}

              {tabJefe === 'reportar' && (
                <div className="max-w-lg">
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 border-b border-[#835100]/30 flex items-center gap-2">
                      <MdReport className="text-[#835100] text-lg" />
                      <h2 className="font-semibold text-on-surface text-sm">Reportar incidente de herramienta</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {!cuadrillaId ? (
                        <p className="text-outline text-sm text-center py-6">Selecciona una emergencia activa para reportar</p>
                      ) : (
                        <>
                          <div>
                            <label className="label">Herramienta afectada</label>
                            <select value={herramientaReporte} onChange={(e) => setHerramientaReporte(e.target.value)} className="input-field">
                              <option value="">Selecciona una herramienta</option>
                              {herramientas.map((h) => (
                                <option key={h.id} value={h.id}>{h.nombre} — {ESTILOS_ESTADO[h.estado]?.etiqueta}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label">Tipo de incidente</label>
                            <select value={estadoReporte} onChange={(e) => setEstadoReporte(e.target.value)} className="input-field">
                              <option value="danada">Dañada — presenta daños físicos</option>
                              <option value="perdida">Perdida — no se encontró</option>
                              <option value="no_devuelta">No devuelta — pendiente de entrega</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Observaciones</label>
                            <textarea value={obsReporte} onChange={(e) => setObsReporte(e.target.value)} rows={3} placeholder="Describe lo que ocurrió con la herramienta..." className="input-field resize-none" />
                          </div>
                          <Button onClick={handleReportarIncidente} disabled={guardando}>
                            {guardando ? 'Enviando...' : 'Registrar incidente'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tabJefe === 'solicitar' && (
                <div className="flex flex-col gap-5 max-w-2xl">
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 bg-primary-50 border-b border-primary/30 flex items-center gap-2">
                      <MdOutlineRequestPage className="text-primary text-lg" />
                      <h2 className="font-semibold text-on-surface text-sm">Nueva solicitud</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {!cuadrillaId ? (
                        <p className="text-outline text-sm text-center py-6">Selecciona una emergencia activa para solicitar</p>
                      ) : (
                        <>
                          <div>
                            <label className="label">Tipo de solicitud</label>
                            <div className="flex gap-2">
                              {[{ val: 'herramienta', label: 'Herramienta' }, { val: 'epp', label: 'EPP' }].map(({ val, label }) => (
                                <button key={val} onClick={() => { setTipoSolicitud(val); setNombreSolicitud(''); }} className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition ${
                                  tipoSolicitud === val ? 'border-primary bg-primary text-white' : 'border-outline-variant text-on-surface-variant hover:border-primary'
                                }`}>{label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="label">Ítem del inventario</label>
                            <div className="flex gap-2">
                              <select
                                required
                                className="input-field flex-1"
                                value={nombreSolicitud}
                                onChange={(e) => setNombreSolicitud(e.target.value)}
                              >
                                <option value="">— Selecciona —</option>
                                {catalogo.filter((c) => c.tipo_item === tipoSolicitud).map((c) => {
                                  const disp = c.disponible ?? Math.max(0, (c.buenas ?? 0) - (c.entregadas ?? 0));
                                  return (
                                    <option key={`${c.nombre}|${c.tipo_item}`} value={c.nombre}>
                                      {c.nombre} (Disponible: {disp})
                                    </option>
                                  );
                                })}
                              </select>
                              <input
                                type="number"
                                min={1}
                                max={999}
                                className="w-20 input-field text-center"
                                value={cantidadSolicitud}
                                onChange={(e) => setCantidadSolicitud(e.target.value)}
                                title="Cantidad"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="label">Motivo / detalles</label>
                            <textarea value={descSolicitud} onChange={(e) => setDescSolicitud(e.target.value)} rows={2} placeholder="¿Para qué se necesita?" className="input-field resize-none" />
                          </div>
                          <Button onClick={handleEnviarSolicitud} disabled={guardando}>
                            {guardando ? 'Enviando...' : 'Enviar solicitud al coordinador'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {cuadrillaId && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center justify-between">
                        <h2 className="font-semibold text-on-surface text-sm">Mis solicitudes anteriores</h2>
                        <button onClick={cargarSolicitudes} className="flex items-center gap-1 px-3 py-1 bg-white border border-outline-variant rounded-lg text-xs text-outline hover:text-primary hover:border-primary transition">
                          <MdFilterList /> Actualizar
                        </button>
                      </div>
                      <div className="p-4">
                        {cargandoSol ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-outline">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Cargando...</span>
                          </div>
                        ) : solicitudes.length === 0 ? (
                          <p className="text-outline text-sm text-center py-6">Aún no has enviado solicitudes</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {solicitudes.map((s) => (
                              <div key={s.id} className="flex items-start justify-between gap-2 p-3 bg-surface-container-low rounded-xl border border-outline-variant/60">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <Badge color={s.tipo === 'epp' ? 'warning' : 'blue'}>{s.tipo === 'epp' ? 'EPP' : 'Herramienta'}</Badge>
                                    {s.nombre_item ? <span className="text-sm font-bold text-primary">"{s.nombre_item}"</span> : <span className="text-xs text-outline italic">(sin ítem)</span>}
                                    {(s.cantidad ?? 1) > 1 && <span className="text-xs text-on-surface-variant">×{s.cantidad}</span>}
                                  </div>
                                  {s.descripcion && <p className="text-on-surface text-xs mt-0.5">{s.descripcion}</p>}
                                  {s.respuesta && <p className="text-outline text-xs italic mt-0.5">Respuesta: {s.respuesta}</p>}
                                </div>
                                <Badge color={s.estado === 'aprobada' ? 'success' : s.estado === 'pendiente' ? 'warning' : 'error'}>
                                  {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

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
