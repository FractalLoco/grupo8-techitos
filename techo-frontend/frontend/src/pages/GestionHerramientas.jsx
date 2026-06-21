import { useState, useEffect } from 'react';
import {
  MdBuild,
  MdInventory,
  MdAddCircle,
  MdCheckCircle,
  MdError,
  MdWarning,
  MdClose,
  MdSave,
  MdFilterList,
  MdReport,
  MdOutlineRequestPage,
} from 'react-icons/md';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import {
  listarHerramientas,
  registrarHerramienta,
  registrarHerramientasMasivas,
  actualizarEstadoHerramienta,
} from '../services/herramientaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import { listarCuadrillas, obtenerBalanceHerramientas, cerrarBalanceDia } from '../services/cuadrillaService';
import { crearSolicitud, listarSolicitudesPorCuadrilla } from '../services/solicitudService';

const ESTILOS_ESTADO = {
  entregada: { borde: 'border-techo-secondary', badge: 'bg-blue-100 text-blue-800',     punto: 'bg-techo-secondary', etiqueta: 'Entregada' },
  buena:     { borde: 'border-techo-success',   badge: 'bg-green-100 text-green-800',   punto: 'bg-techo-success',   etiqueta: 'Buena' },
  danada:    { borde: 'border-techo-accent',     badge: 'bg-orange-100 text-orange-800', punto: 'bg-techo-accent',    etiqueta: 'Dañada' },
  perdida:   { borde: 'border-techo-danger',     badge: 'bg-red-100 text-red-800',       punto: 'bg-techo-danger',    etiqueta: 'Perdida' },
  no_devuelta: { borde: 'border-purple-500',     badge: 'bg-purple-100 text-purple-800', punto: 'bg-purple-500',      etiqueta: 'No devuelta' },
};

const BALANCE_STATS = [
  { clave: 'entregadas',  etiqueta: 'Entregadas',   clasesPunto: 'bg-techo-secondary', clasesTexto: 'text-blue-700',   clasesFila: 'bg-blue-50' },
  { clave: 'buenas',      etiqueta: 'Buenas',       clasesPunto: 'bg-techo-success',   clasesTexto: 'text-green-700',  clasesFila: 'bg-green-50' },
  { clave: 'danadas',     etiqueta: 'Dañadas',      clasesPunto: 'bg-techo-accent',    clasesTexto: 'text-orange-700', clasesFila: 'bg-orange-50' },
  { clave: 'perdidas',    etiqueta: 'Perdidas',      clasesPunto: 'bg-techo-danger',    clasesTexto: 'text-red-700',    clasesFila: 'bg-red-50' },
  { clave: 'noDevueltas', etiqueta: 'No devueltas', clasesPunto: 'bg-purple-500',       clasesTexto: 'text-purple-700', clasesFila: 'bg-purple-50' },
];

const BADGE_SOL = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
};

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

  // Coordinador — registro
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modoRegistro, setModoRegistro] = useState('individual');
  const [nombreHerramienta, setNombreHerramienta] = useState('');
  const [nombresMultiples, setNombresMultiples] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Jefe — tabs
  const [tabJefe, setTabJefe] = useState('mis-herramientas');

  // Jefe — reporte
  const [herramientaReporte, setHerramientaReporte] = useState('');
  const [estadoReporte, setEstadoReporte] = useState('danada');
  const [obsReporte, setObsReporte] = useState('');

  // Jefe — solicitud
  const [tipoSolicitud, setTipoSolicitud] = useState('herramienta');
  const [descSolicitud, setDescSolicitud] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSol, setCargandoSol] = useState(false);

  useEffect(() => {
    obtenerEmergencias()
      .then((res) => {
        const lista = res.datos?.emergencias || res.datos || [];
        const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
        setEmergencias(activas);
        if (activas.length > 0) setEmergenciaId(String(activas[0].id));
      })
      .catch(() => setError('No se pudieron cargar las emergencias'));
  }, []);

  useEffect(() => {
    if (!emergenciaId) return;
    listarCuadrillas(emergenciaId)
      .then((res) => {
        const lista = res.datos?.cuadrillas || [];
        setCuadrillas(lista);
        if (esJefe) {
          const miCuadrilla = lista.find((c) => c.jefe_id === usuario?.id);
          setCuadrillaId(miCuadrilla ? String(miCuadrilla.id) : '');
        } else if (lista.length > 0) {
          setCuadrillaId(String(lista[0].id));
        }
      })
      .catch(() => setError('Error al cargar cuadrillas'));
  }, [emergenciaId, esJefe, usuario]);

  useEffect(() => {
    if (!cuadrillaId) return;
    cargarHerramientas();
    cargarBalance();
  }, [cuadrillaId]);

  useEffect(() => {
    if (esJefe && cuadrillaId && tabJefe === 'solicitar') {
      cargarSolicitudes();
    }
  }, [tabJefe, cuadrillaId, esJefe]);

  const cargarHerramientas = async () => {
    setCargando(true);
    try {
      const res = await listarHerramientas(cuadrillaId);
      setHerramientas(res.datos?.herramientas || []);
    } catch { setError('Error al cargar herramientas'); }
    finally { setCargando(false); }
  };

  const cargarBalance = async () => {
    try {
      const res = await obtenerBalanceHerramientas(cuadrillaId);
      setBalance(res.datos?.balance || null);
    } catch { /* sin balance aún */ }
  };

  const cargarSolicitudes = async () => {
    setCargandoSol(true);
    try {
      const res = await listarSolicitudesPorCuadrilla(cuadrillaId);
      setSolicitudes(res.datos?.solicitudes || []);
    } catch { /* vacío */ }
    finally { setCargandoSol(false); }
  };

  const mostrarExito = (msg) => { setExito(msg); setTimeout(() => setExito(''), 3500); };

  // ── Handlers coordinador ──────────────────────────────────────────────────
  const handleRegistrarIndividual = async () => {
    if (!nombreHerramienta.trim()) return;
    setGuardando(true);
    const res = await registrarHerramienta(cuadrillaId, nombreHerramienta.trim());
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setNombreHerramienta('');
      await cargarHerramientas(); await cargarBalance();
      mostrarExito('Herramienta registrada');
    } else { setError(res.mensaje || 'Error al registrar'); }
  };

  const handleRegistrarMasivo = async () => {
    const nombres = nombresMultiples.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    if (nombres.length === 0) return;
    setGuardando(true);
    const res = await registrarHerramientasMasivas(cuadrillaId, nombres);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setNombresMultiples('');
      await cargarHerramientas(); await cargarBalance();
      mostrarExito(`${nombres.length} herramientas registradas`);
    } else { setError(res.mensaje || 'Error al registrar'); }
  };

  const handleGuardarEstado = async (herramientaId) => {
    if (!nuevoEstado) return;
    setGuardando(true);
    const res = await actualizarEstadoHerramienta(herramientaId, nuevoEstado, observaciones);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setEditandoId(null); setNuevoEstado(''); setObservaciones('');
      await cargarHerramientas(); await cargarBalance();
      mostrarExito('Estado actualizado');
    } else { setError(res.mensaje || 'Error al actualizar'); }
  };

  const handleCerrarBalance = async () => {
    if (!window.confirm('¿Cerrar el balance del día? Si hay herramientas dañadas o perdidas se activará una alerta.')) return;
    setGuardando(true);
    const res = await cerrarBalanceDia(cuadrillaId);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      await cargarBalance();
      mostrarExito('Balance cerrado. Alertas actualizadas.');
    } else { setError(res.mensaje || 'Error al cerrar balance'); }
  };

  // ── Handlers jefe ─────────────────────────────────────────────────────────
  const handleReportarIncidente = async () => {
    if (!herramientaReporte) { setError('Selecciona una herramienta'); return; }
    setGuardando(true);
    const res = await actualizarEstadoHerramienta(herramientaReporte, estadoReporte, obsReporte);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setHerramientaReporte(''); setEstadoReporte('danada'); setObsReporte('');
      await cargarHerramientas();
      mostrarExito('Incidente reportado correctamente');
    } else { setError(res.mensaje || 'Error al reportar'); }
  };

  const handleEnviarSolicitud = async () => {
    if (!descSolicitud.trim()) { setError('Describe lo que necesitas'); return; }
    if (!emergenciaId || !cuadrillaId) { setError('Selecciona emergencia y cuadrilla'); return; }
    setGuardando(true);
    try {
      await crearSolicitud({ cuadrillaId: parseInt(cuadrillaId), emergenciaId: parseInt(emergenciaId), tipo: tipoSolicitud, descripcion: descSolicitud.trim() });
      setDescSolicitud('');
      await cargarSolicitudes();
      mostrarExito('Solicitud enviada al coordinador');
    } catch { setError('Error al enviar solicitud'); }
    finally { setGuardando(false); }
  };

  const herramientasFiltradas = filtroEstado === 'todos' ? herramientas : herramientas.filter((h) => h.estado === filtroEstado);
  const cuadrillaActual = cuadrillas.find((c) => String(c.id) === cuadrillaId);

  // ── Componentes compartidos ───────────────────────────────────────────────
  const Mensajes = () => (
    <>
      {error && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-red-50 border border-techo-danger/40 rounded-xl">
          <MdError className="text-techo-danger text-xl flex-shrink-0" />
          <p className="text-red-800 text-sm flex-1">{error}</p>
          <button onClick={() => setError('')}><MdClose className="text-red-400" /></button>
        </div>
      )}
      {exito && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-green-50 border border-techo-success/40 rounded-xl">
          <MdCheckCircle className="text-techo-success text-xl flex-shrink-0" />
          <p className="text-green-800 text-sm">{exito}</p>
        </div>
      )}
    </>
  );

  const ListaHerramientas = ({ soloLectura = false }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-techo-primary/5 border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MdBuild className="text-techo-primary" />
          <h2 className="font-semibold text-techo-primary text-sm">
            {cuadrillaActual?.nombre || 'Mi cuadrilla'}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <MdFilterList className="text-gray-400 text-base" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-techo-secondary"
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
          <div className="flex items-center justify-center py-10 text-gray-400 gap-2.5">
            <div className="w-5 h-5 border-2 border-techo-secondary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        )}
        {!cargando && herramientasFiltradas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400">
            <MdBuild className="text-5xl mb-3 opacity-20" />
            <p className="text-sm font-medium text-gray-500">No hay herramientas</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {filtroEstado === 'todos' ? 'Sin herramientas registradas aún.' : 'Sin herramientas con este estado.'}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {herramientasFiltradas.map((h, idx) => {
            const estilos = ESTILOS_ESTADO[h.estado] || ESTILOS_ESTADO.entregada;
            const estaEditando = !soloLectura && editandoId === h.id;
            return (
              <div key={h.id} style={{ animationDelay: `${idx * 40}ms` }} className={`animate-fadeInUp border-l-4 ${estilos.borde} bg-gray-50 rounded-r-xl p-3 hover:-translate-y-px hover:shadow-sm transition-all duration-200`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-gray-800 font-medium text-sm">{h.nombre}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${estilos.badge}`}>{estilos.etiqueta}</span>
                    {!soloLectura && (h.estado === 'entregada' || h.estado === 'buena') && (
                      <button
                        onClick={() => { setEditandoId(estaEditando ? null : h.id); setNuevoEstado('danada'); setObservaciones(''); }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-semibold transition"
                      >
                        <MdWarning className="text-sm" /> Marcar daño
                      </button>
                    )}
                  </div>
                </div>
                {h.observaciones && <p className="text-xs text-gray-500 mt-1.5 italic">Obs: {h.observaciones}</p>}
                {estaEditando && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 flex flex-col gap-2">
                    <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary">
                      <option value="buena">Buena — devuelta en buen estado</option>
                      <option value="danada">Dañada — presenta daños</option>
                      <option value="perdida">Perdida — no se encontró</option>
                      <option value="no_devuelta">No devuelta — pendiente</option>
                    </select>
                    <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones (opcional)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary" />
                    <div className="flex gap-2">
                      <button onClick={() => handleGuardarEstado(h.id)} disabled={guardando} className="flex-1 flex items-center justify-center gap-1 py-2 bg-techo-primary text-white text-xs font-bold rounded-lg hover:bg-techo-primaryDark transition disabled:opacity-60">
                        <MdSave /> Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition">Cancelar</button>
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
    <div className="min-h-screen bg-techo-light">
      <Navbar />
      <div className="pt-[76px]">
        {/* Header */}
        <div className="bg-techo-primary shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-1">
              <MdBuild className="text-techo-secondary text-2xl flex-shrink-0" />
              <h1 className="text-white font-bold text-lg tracking-tight">Control de Herramientas</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
              <select
                value={emergenciaId}
                onChange={(e) => { setEmergenciaId(e.target.value); setCuadrillaId(''); setHerramientas([]); setBalance(null); }}
                className="bg-white/10 text-white border border-white/25 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary min-w-[160px]"
              >
                {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
                {emergencias.map((e) => <option key={e.id} value={e.id} className="text-gray-800 bg-white">{e.nombre}</option>)}
              </select>
            </div>
            {esCoordinador && (
              <div className="flex items-center gap-1.5">
                <label className="text-white/60 text-xs font-medium whitespace-nowrap">Cuadrilla</label>
                <select
                  value={cuadrillaId}
                  onChange={(e) => setCuadrillaId(e.target.value)}
                  className="bg-white/10 text-white border border-white/25 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary min-w-[160px]"
                >
                  {cuadrillas.length === 0 && <option value="">Sin cuadrillas</option>}
                  {cuadrillas.map((c) => <option key={c.id} value={c.id} className="text-gray-800 bg-white">{c.nombre}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Vista COORDINADOR ─────────────────────────────────────────────── */}
        {esCoordinador && (
          <div className="max-w-5xl mx-auto px-4 py-6">
            <Mensajes />
            {cuadrillaId ? (
              <div className="flex gap-5 flex-wrap lg:flex-nowrap items-start">
                {/* Columna izquierda */}
                <div className="flex flex-col gap-5 w-full lg:w-72 flex-shrink-0">
                  {/* Balance */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-techo-primary/5 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                      <MdInventory className="text-techo-primary text-lg" />
                      <h2 className="font-semibold text-techo-primary text-sm">Balance del día</h2>
                    </div>
                    <div className="p-4">
                      {balance ? (
                        <>
                          <div className="flex flex-col gap-1.5 mb-3">
                            {BALANCE_STATS.map(({ clave, etiqueta, clasesPunto, clasesTexto, clasesFila }) => (
                              <div key={clave} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${clasesFila}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${clasesPunto}`} />
                                  <span className="text-gray-600 text-xs">{etiqueta}</span>
                                </div>
                                <span className={`font-bold text-sm ${clasesTexto}`}>{balance[clave] ?? 0}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-gray-100 pt-3 flex justify-between items-center px-1 mb-1">
                            <span className="text-xs text-gray-500 font-medium">Total registradas</span>
                            <span className="text-techo-primary font-bold text-base">{balance.total ?? 0}</span>
                          </div>
                          <button onClick={handleCerrarBalance} disabled={guardando} className="mt-3 w-full py-2 bg-techo-primary hover:bg-techo-primaryDark text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
                            {guardando ? 'Cerrando...' : 'Cerrar balance del día'}
                          </button>
                        </>
                      ) : (
                        <p className="text-gray-400 text-sm text-center py-4">Sin herramientas registradas aún.</p>
                      )}
                    </div>
                  </div>

                  {/* Registro */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-techo-primary/5 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                      <MdAddCircle className="text-techo-primary text-lg" />
                      <h2 className="font-semibold text-techo-primary text-sm">Registrar herramientas</h2>
                    </div>
                    <div className="p-4">
                      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
                        {['individual', 'masivo'].map((modo) => (
                          <button key={modo} onClick={() => setModoRegistro(modo)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${modoRegistro === modo ? 'bg-techo-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{modo}</button>
                        ))}
                      </div>
                      {modoRegistro === 'individual' ? (
                        <div className="flex gap-2">
                          <input type="text" value={nombreHerramienta} onChange={(e) => setNombreHerramienta(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRegistrarIndividual()} placeholder="Nombre de la herramienta" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary" />
                          <button onClick={handleRegistrarIndividual} disabled={guardando} className="px-4 py-2 bg-techo-success text-white text-sm font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-60">+</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <textarea value={nombresMultiples} onChange={(e) => setNombresMultiples(e.target.value)} rows={4} placeholder={"Un nombre por línea:\nmartillo\npala\nnivel"} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary resize-y" />
                          <button onClick={handleRegistrarMasivo} disabled={guardando} className="w-full py-2 bg-techo-success text-white text-sm font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-60">{guardando ? 'Registrando...' : 'Registrar todas'}</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista */}
                <div className="flex-1 min-w-0">
                  <ListaHerramientas soloLectura={false} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-28 text-gray-400">
                <MdBuild className="text-7xl mb-4 opacity-20" />
                <p className="text-base font-medium text-gray-500">Selecciona una emergencia y cuadrilla</p>
                <p className="text-sm text-gray-400 mt-1">para ver y gestionar sus herramientas</p>
              </div>
            )}
          </div>
        )}

        {/* ── Vista JEFE DE CUADRILLA ────────────────────────────────────────── */}
        {esJefe && (
          <>
            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
              <div className="max-w-5xl mx-auto px-4 flex gap-1 pt-2">
                {[
                  { key: 'mis-herramientas', label: 'Mis herramientas', icon: <MdBuild className="text-base" /> },
                  { key: 'reportar',          label: 'Reportar incidente', icon: <MdReport className="text-base" /> },
                  { key: 'solicitar',         label: 'Solicitar herramienta / EPP', icon: <MdOutlineRequestPage className="text-base" /> },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setTabJefe(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${tabJefe === key ? 'border-techo-primary text-techo-primary bg-techo-primary/5' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
              <Mensajes />

              {/* Tab: Mis herramientas */}
              {tabJefe === 'mis-herramientas' && (
                cuadrillaId ? (
                  <ListaHerramientas soloLectura={true} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-28 text-gray-400">
                    <MdBuild className="text-7xl mb-4 opacity-20" />
                    <p className="text-base font-medium text-gray-500">No tienes cuadrilla asignada</p>
                    <p className="text-sm text-gray-400 mt-1">Selecciona una emergencia activa</p>
                  </div>
                )
              )}

              {/* Tab: Reportar incidente */}
              {tabJefe === 'reportar' && (
                <div className="max-w-lg">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-orange-50 border-b border-orange-100 px-4 py-3 flex items-center gap-2">
                      <MdReport className="text-techo-accent text-lg" />
                      <h2 className="font-semibold text-gray-800 text-sm">Reportar incidente de herramienta</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {!cuadrillaId ? (
                        <p className="text-gray-400 text-sm text-center py-6">Selecciona una emergencia activa para reportar</p>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs text-gray-500 font-medium mb-1 block">Herramienta afectada</label>
                            <select value={herramientaReporte} onChange={(e) => setHerramientaReporte(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary">
                              <option value="">Selecciona una herramienta</option>
                              {herramientas.map((h) => (
                                <option key={h.id} value={h.id}>{h.nombre} — {ESTILOS_ESTADO[h.estado]?.etiqueta}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium mb-1 block">Tipo de incidente</label>
                            <select value={estadoReporte} onChange={(e) => setEstadoReporte(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary">
                              <option value="danada">Dañada — presenta daños físicos</option>
                              <option value="perdida">Perdida — no se encontró</option>
                              <option value="no_devuelta">No devuelta — pendiente de entrega</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium mb-1 block">Observaciones</label>
                            <textarea value={obsReporte} onChange={(e) => setObsReporte(e.target.value)} rows={3} placeholder="Describe lo que ocurrió con la herramienta..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary resize-none" />
                          </div>
                          <button onClick={handleReportarIncidente} disabled={guardando} className="w-full py-2.5 bg-techo-accent text-white text-sm font-bold rounded-xl hover:bg-yellow-600 transition disabled:opacity-60">
                            {guardando ? 'Enviando...' : 'Registrar incidente'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Solicitar herramienta / EPP */}
              {tabJefe === 'solicitar' && (
                <div className="flex flex-col gap-5 max-w-2xl">
                  {/* Formulario */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-techo-secondary/10 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                      <MdOutlineRequestPage className="text-techo-secondary text-lg" />
                      <h2 className="font-semibold text-gray-800 text-sm">Nueva solicitud</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {!cuadrillaId ? (
                        <p className="text-gray-400 text-sm text-center py-6">Selecciona una emergencia activa para solicitar</p>
                      ) : (
                        <>
                          <div>
                            <label className="text-xs text-gray-500 font-medium mb-1 block">Tipo de solicitud</label>
                            <div className="flex gap-2">
                              {[{ val: 'herramienta', label: 'Herramienta' }, { val: 'epp', label: 'EPP' }].map(({ val, label }) => (
                                <button key={val} onClick={() => setTipoSolicitud(val)} className={`flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition ${tipoSolicitud === val ? 'border-techo-secondary bg-techo-secondary text-white' : 'border-gray-200 text-gray-500 hover:border-techo-secondary'}`}>{label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 font-medium mb-1 block">Descripción de lo que necesitas</label>
                            <textarea value={descSolicitud} onChange={(e) => setDescSolicitud(e.target.value)} rows={3} placeholder={tipoSolicitud === 'epp' ? 'Ej: 3 cascos talla M para nuevos voluntarios' : 'Ej: 2 martillos adicionales y 1 nivel'} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary resize-none" />
                          </div>
                          <button onClick={handleEnviarSolicitud} disabled={guardando} className="w-full py-2.5 bg-techo-secondary text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition disabled:opacity-60">
                            {guardando ? 'Enviando...' : 'Enviar solicitud al coordinador'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mis solicitudes */}
                  {cuadrillaId && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-700 text-sm">Mis solicitudes anteriores</h2>
                        <button onClick={cargarSolicitudes} className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-techo-primary hover:border-techo-primary transition">
                          <MdFilterList /> Actualizar
                        </button>
                      </div>
                      <div className="p-4">
                        {cargandoSol ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                            <div className="w-4 h-4 border-2 border-techo-secondary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Cargando...</span>
                          </div>
                        ) : solicitudes.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-6">Aún no has enviado solicitudes</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {solicitudes.map((s) => (
                              <div key={s.id} className="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.tipo === 'epp' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{s.tipo === 'epp' ? 'EPP' : 'Herramienta'}</span>
                                  </div>
                                  <p className="text-gray-700 text-sm mt-0.5">{s.descripcion}</p>
                                  {s.respuesta && <p className="text-gray-500 text-xs italic mt-0.5">Respuesta: {s.respuesta}</p>}
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${BADGE_SOL[s.estado]}`}>
                                  {s.estado.charAt(0).toUpperCase() + s.estado.slice(1)}
                                </span>
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
    </div>
  );
}
