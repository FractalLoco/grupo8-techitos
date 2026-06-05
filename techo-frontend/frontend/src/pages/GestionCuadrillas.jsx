import { useEffect, useState, useCallback } from 'react';
import {
  MdGroups,
  MdAdd,
  MdDelete,
  MdWarning,
  MdCheckCircle,
  MdBuild,
  MdPersonAdd,
  MdPersonRemove,
  MdAssignment,
  MdDone,
  MdSwapHoriz,
  MdClose,
  MdRefresh,
  MdOutlineFilterList,
  MdError,
  MdInfo,
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

// Mapa de colores de estado para los indicadores visuales del mapa y la lista
const COLORES = {
  verde: { bg: 'bg-green-100', borde: 'border-green-500', texto: 'text-green-700', dot: 'bg-green-500', label: 'En plazo' },
  amarillo: { bg: 'bg-yellow-100', borde: 'border-yellow-500', texto: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Riesgo de retraso' },
  rojo: { bg: 'bg-red-100', borde: 'border-red-500', texto: 'text-red-700', dot: 'bg-red-500', label: 'Requiere intervención' },
  azul: { bg: 'bg-blue-100', borde: 'border-blue-500', texto: 'text-blue-700', dot: 'bg-blue-500', label: 'Sin obra asignada' },
  gris: { bg: 'bg-gray-100', borde: 'border-gray-400', texto: 'text-gray-600', dot: 'bg-gray-400', label: 'Completada' },
};

const FASES = ['limpieza', 'montaje', 'terminaciones'];

function GestionCuadrillas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';

  // ── Estado general ──────────────────────────────────────────────────────────
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [obras, setObras] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroColor, setFiltroColor] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'exito'|'error', texto }

  // ── Formulario nueva cuadrilla ──────────────────────────────────────────────
  const [formCuadrilla, setFormCuadrilla] = useState({ nombre: '', jefe_id: '', plazo_dias: 5 });
  const [mostrarFormCuadrilla, setMostrarFormCuadrilla] = useState(false);

  // ── Panel de detalle / acciones de cuadrilla ───────────────────────────────
  const [cuadrillaActiva, setCuadrillaActiva] = useState(null);
  const [panel, setPanel] = useState(null); // 'miembros' | 'obra' | 'fase' | 'alerta' | 'herramientas' | 'reasignar' | 'balance'

  // ── Formularios secundarios ─────────────────────────────────────────────────
  const [voluntarioId, setVoluntarioId] = useState('');
  const [habilidades, setHabilidades] = useState('');
  const [obraId, setObraId] = useState('');
  const [faseSeleccionada, setFaseSeleccionada] = useState('');
  const [descripcionAlerta, setDescripcionAlerta] = useState('');
  const [cuadrillaDestinoId, setCuadrillaDestinoId] = useState('');
  const [voluntarioReasignarId, setVoluntarioReasignarId] = useState('');

  // ── Herramientas ────────────────────────────────────────────────────────────
  const [herramientas, setHerramientas] = useState([]);
  const [nombresHerramientas, setNombresHerramientas] = useState('');
  const [balance, setBalance] = useState(null);

  // ── Carga de datos base ─────────────────────────────────────────────────────
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

  // Si el jefe solo ve su cuadrilla, filtramos por jefe_id
  const cuadrillasVisibles = esJefe
    ? cuadrillas.filter((c) => c.jefe_id === usuario?.id)
    : cuadrillas;

  // ── Helpers ─────────────────────────────────────────────────────────────────
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

  // ── Acciones del coordinador ────────────────────────────────────────────────
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

  // ── Acciones del jefe ───────────────────────────────────────────────────────
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
    const nombres = nombresHerramientas
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
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

  // ── Render ──────────────────────────────────────────────────────────────────
  const colorInfo = (c) => COLORES[c] || COLORES.gris;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-[76px] px-4 pb-8 max-w-6xl mx-auto">
        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-6">
          <MdGroups className="text-3xl text-techo-primary" />
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Cuadrillas</h1>
        </div>

        {/* Toast de mensaje */}
        {mensaje && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm font-medium shadow ${
              mensaje.tipo === 'exito'
                ? 'bg-green-50 text-green-800 border border-green-300'
                : 'bg-red-50 text-red-800 border border-red-300'
            }`}
          >
            {mensaje.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
            {mensaje.texto}
          </div>
        )}

        {/* Selector de emergencia */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Emergencia activa</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-primary"
            value={emergenciaId}
            onChange={(e) => { setEmergenciaId(e.target.value); setFiltroColor(''); }}
          >
            <option value="">— Selecciona una emergencia —</option>
            {emergencias.map((em) => (
              <option key={em.id} value={em.id}>{em.nombre}</option>
            ))}
          </select>
        </div>

        {emergenciaId && (
          <>
            {/* Filtros y acción crear (solo coordinador) */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <MdOutlineFilterList /> Filtrar:
              </span>
              {['', 'verde', 'amarillo', 'rojo', 'azul', 'gris'].map((c) => (
                <button
                  key={c}
                  onClick={() => setFiltroColor(c)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    filtroColor === c
                      ? 'bg-techo-primary text-white border-techo-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-techo-primary'
                  }`}
                >
                  {c === '' ? 'Todos' : (COLORES[c]?.label || c)}
                </button>
              ))}
              <button
                onClick={cargarCuadrillas}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition"
              >
                <MdRefresh /> Actualizar
              </button>
              {esCoordinador && (
                <button
                  onClick={() => setMostrarFormCuadrilla(true)}
                  className="flex items-center gap-1 px-4 py-1.5 bg-techo-primary hover:bg-techo-dark text-white rounded-lg text-sm font-semibold transition"
                >
                  <MdAdd /> Nueva cuadrilla
                </button>
              )}
            </div>

            {/* Lista de cuadrillas */}
            {cargando ? (
              <p className="text-center text-gray-400 py-10">Cargando...</p>
            ) : cuadrillasVisibles.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <MdGroups className="text-5xl mx-auto mb-2 opacity-40" />
                <p>No hay cuadrillas{filtroColor ? ` con estado "${COLORES[filtroColor]?.label}"` : ''}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cuadrillasVisibles.map((c) => {
                  const ci = colorInfo(c.estadoColor);
                  return (
                    <div
                      key={c.id}
                      className={`bg-white rounded-xl border-l-4 ${ci.borde} shadow-sm p-4 flex flex-col gap-2`}
                    >
                      {/* Cabecera tarjeta */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${ci.dot} flex-shrink-0`}></span>
                          <h2 className="font-bold text-gray-800 text-base">{c.nombre}</h2>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ci.bg} ${ci.texto}`}>
                          {ci.label}
                        </span>
                      </div>

                      {/* Info rápida */}
                      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Estado: <strong className="text-gray-700">{c.estado}</strong></span>
                        <span>Fase: <strong className="text-gray-700">{c.fase || '—'}</strong></span>
                        <span>Plazo: <strong className="text-gray-700">{c.plazo_dias} días</strong></span>
                        <span>Miembros: <strong className="text-gray-700">{c.miembrosCount ?? '?'}</strong></span>
                      </div>

                      {/* Alertas activas */}
                      {c.alerta_emergencia && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-xs text-red-700">
                          <FaExclamationTriangle />
                          <span><strong>Alerta:</strong> {c.descripcion_emergencia}</span>
                        </div>
                      )}
                      {c.alerta_herramienta && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-300 rounded-lg px-3 py-2 text-xs text-orange-700">
                          <FaWrench />
                          <span><strong>Herramientas:</strong> {c.descripcion_alerta_herramienta}</span>
                        </div>
                      )}

                      {/* Botones de acción */}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {esCoordinador && c.estado !== 'completada' && (
                          <>
                            <BtnAccion icono={<MdPersonAdd />} label="Miembros" onClick={() => abrirPanel(c, 'miembros')} color="blue" />
                            <BtnAccion icono={<MdAssignment />} label="Asignar obra" onClick={() => abrirPanel(c, 'obra')} color="indigo" />
                            <BtnAccion icono={<MdSwapHoriz />} label="Reasignar" onClick={() => abrirPanel(c, 'reasignar')} color="purple" />
                            <BtnAccion icono={<MdDone />} label="Completar" onClick={() => handleCompletarCuadrilla(c.id)} color="green" />
                          </>
                        )}
                        {(esJefe && c.jefe_id === usuario?.id && c.estado !== 'completada') && (
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

      {/* ── Modal: nueva cuadrilla ─────────────────────────────────────────── */}
      {mostrarFormCuadrilla && (
        <Modal titulo="Nueva cuadrilla" onCerrar={() => setMostrarFormCuadrilla(false)}>
          <form onSubmit={handleCrearCuadrilla} className="flex flex-col gap-4">
            <Campo label="Nombre de la cuadrilla">
              <input
                required
                className={estiloInput}
                placeholder="Ej: Cuadrilla Norte A"
                value={formCuadrilla.nombre}
                onChange={(e) => setFormCuadrilla({ ...formCuadrilla, nombre: e.target.value })}
              />
            </Campo>
            <Campo label="Jefe de cuadrilla">
              <select
                required
                className={estiloInput}
                value={formCuadrilla.jefe_id}
                onChange={(e) => setFormCuadrilla({ ...formCuadrilla, jefe_id: e.target.value })}
              >
                <option value="">— Selecciona jefe —</option>
                {usuarios.filter((u) => u.rol === 'jefe_cuadrilla' && u.activo).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rut})</option>
                ))}
              </select>
            </Campo>
            <Campo label="Plazo de entrega">
              <select
                className={estiloInput}
                value={formCuadrilla.plazo_dias}
                onChange={(e) => setFormCuadrilla({ ...formCuadrilla, plazo_dias: Number(e.target.value) })}
              >
                <option value={2}>2 días (trabajo menor)</option>
                <option value={5}>5 días (trabajo mayor)</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Los voluntarios se agregan después de crear la cuadrilla (mínimo 10, máximo 11).</p>
            </Campo>
            <button type="submit" className="w-full py-2.5 bg-techo-primary text-white font-semibold rounded-lg hover:bg-techo-dark transition">
              Crear cuadrilla
            </button>
          </form>
        </Modal>
      )}

      {/* ── Panel de acciones contextual ──────────────────────────────────── */}
      {panel && cuadrillaActiva && (
        <Modal titulo={tituloPanel(panel, cuadrillaActiva)} onCerrar={cerrarPanel}>

          {/* Agregar/eliminar miembros */}
          {panel === 'miembros' && (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleAgregarMiembro} className="flex flex-col gap-3">
                <Campo label="Voluntario a agregar">
                  <select required className={estiloInput} value={voluntarioId} onChange={(e) => setVoluntarioId(e.target.value)}>
                    <option value="">— Selecciona voluntario —</option>
                    {usuarios.filter((u) => u.rol === 'voluntario' && u.activo).map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre} ({u.rut})</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Habilidades (opcional)">
                  <input className={estiloInput} placeholder="Ej: carpintería, primeros auxilios" value={habilidades} onChange={(e) => setHabilidades(e.target.value)} />
                </Campo>
                <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                  <MdPersonAdd /> Agregar miembro
                </button>
              </form>
              <p className="text-xs text-gray-400">La cuadrilla necesita entre 10 y 11 integrantes. Si superas 11 el sistema mostrará una advertencia.</p>
            </div>
          )}

          {/* Asignar obra */}
          {panel === 'obra' && (
            <form onSubmit={handleAsignarObra} className="flex flex-col gap-4">
              <Campo label="Obra disponible">
                <select required className={estiloInput} value={obraId} onChange={(e) => setObraId(e.target.value)}>
                  <option value="">— Selecciona obra —</option>
                  {obras.filter((o) => o.estado === 'disponible').map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre} — {o.direccion || `${o.lat}, ${o.lng}`}
                    </option>
                  ))}
                </select>
              </Campo>
              <p className="text-xs text-gray-400">Al asignar, todos los integrantes recibirán una notificación con la ubicación exacta y el plazo.</p>
              <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-semibold">
                <MdAssignment /> Asignar obra
              </button>
            </form>
          )}

          {/* Actualizar fase */}
          {panel === 'fase' && (
            <form onSubmit={handleActualizarFase} className="flex flex-col gap-4">
              <Campo label="Fase actual del trabajo">
                <select required className={estiloInput} value={faseSeleccionada} onChange={(e) => setFaseSeleccionada(e.target.value)}>
                  <option value="">— Selecciona fase —</option>
                  {FASES.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </Campo>
              <p className="text-xs text-gray-400">El coordinador verá el cambio reflejado inmediatamente en el color del punto del mapa.</p>
              <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-semibold">
                <MdBuild /> Actualizar fase
              </button>
            </form>
          )}

          {/* Enviar alerta de emergencia */}
          {panel === 'alerta' && (
            <form onSubmit={handleEnviarAlerta} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-sm text-red-700">
                <MdWarning className="text-lg flex-shrink-0" />
                Esta alerta llega inmediatamente al coordinador con la ubicación exacta del punto.
              </div>
              <Campo label="Descripción del incidente">
                <textarea
                  required
                  rows={3}
                  className={estiloInput}
                  placeholder="Describe qué está ocurriendo en terreno..."
                  value={descripcionAlerta}
                  onChange={(e) => setDescripcionAlerta(e.target.value)}
                />
              </Campo>
              <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold">
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
              <Campo label="Cuadrilla destino">
                <select required className={estiloInput} value={cuadrillaDestinoId} onChange={(e) => setCuadrillaDestinoId(e.target.value)}>
                  <option value="">— Selecciona cuadrilla —</option>
                  {cuadrillas.filter((c) => c.id !== cuadrillaActiva.id && c.estado !== 'completada').map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </Campo>
              <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold">
                <MdSwapHoriz /> Reasignar voluntario
              </button>
            </form>
          )}

          {/* Herramientas */}
          {panel === 'herramientas' && (
            <div className="flex flex-col gap-4">
              <form onSubmit={handleRegistrarHerramientas} className="flex flex-col gap-2">
                <Campo label="Herramientas (una por línea)">
                  <textarea
                    rows={3}
                    className={estiloInput}
                    placeholder={"Martillo\nEspatula\nCasco"}
                    value={nombresHerramientas}
                    onChange={(e) => setNombresHerramientas(e.target.value)}
                  />
                </Campo>
                <button type="submit" className="flex items-center justify-center gap-2 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-semibold">
                  <FaWrench /> Registrar herramientas
                </button>
              </form>

              {herramientas.length > 0 && (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {herramientas.map((h) => (
                    <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium text-gray-700">{h.nombre}</span>
                      <div className="flex gap-1">
                        {['buena', 'danada', 'perdida', 'no_devuelta'].map((est) => (
                          <button
                            key={est}
                            onClick={() => handleCambiarEstadoHerramienta(h.id, est)}
                            className={`px-2 py-0.5 rounded text-xs font-semibold transition border ${
                              h.estado === est
                                ? estadoHerramientaActivo(est)
                                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {etiquetaEstado(est)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleCerrarBalance}
                className="flex items-center justify-center gap-2 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold"
              >
                <MdDone /> Cerrar balance del día
              </button>
            </div>
          )}

          {/* Balance */}
          {panel === 'balance' && balance && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <FilaBalance label="Total" valor={balance.total} color="gray" />
                <FilaBalance label="Entregadas" valor={balance.entregadas} color="blue" />
                <FilaBalance label="En buen estado" valor={balance.buenas} color="green" />
                <FilaBalance label="Dañadas" valor={balance.danadas} color="yellow" />
                <FilaBalance label="Perdidas" valor={balance.perdidas} color="red" />
                <FilaBalance label="No devueltas" valor={balance.noDevueltas} color="orange" />
              </div>
              {balance.conDiferencias && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2 text-sm text-red-700">
                  <MdWarning />
                  Hay diferencias detectadas. El coordinador fue notificado automáticamente.
                </div>
              )}
              {!balance.conDiferencias && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-lg px-3 py-2 text-sm text-green-700">
                  <MdCheckCircle />
                  Todo en orden. No hay diferencias en el inventario.
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-800 text-base">{titulo}</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 transition">
            <MdClose className="text-xl" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function BtnAccion({ icono, label, onClick, color }) {
  const colores = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${colores[color] || colores.gray}`}
    >
      {icono} {label}
    </button>
  );
}

function FilaBalance({ label, valor, color }) {
  const c = { gray: 'bg-gray-100 text-gray-700', blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700', yellow: 'bg-yellow-100 text-yellow-700', red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700' };
  return (
    <div className={`rounded-lg p-3 flex justify-between items-center ${c[color] || c.gray}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-lg font-bold">{valor ?? 0}</span>
    </div>
  );
}

const tituloPanel = (panel, cuadrilla) => {
  const titulos = {
    miembros: `Miembros — ${cuadrilla.nombre}`,
    obra: `Asignar obra — ${cuadrilla.nombre}`,
    fase: `Actualizar fase — ${cuadrilla.nombre}`,
    alerta: `Alerta de emergencia — ${cuadrilla.nombre}`,
    reasignar: `Reasignar voluntario — ${cuadrilla.nombre}`,
    herramientas: `Herramientas — ${cuadrilla.nombre}`,
    balance: `Balance del día — ${cuadrilla.nombre}`,
  };
  return titulos[panel] || cuadrilla.nombre;
};

const estadoHerramientaActivo = (estado) => {
  const m = { buena: 'bg-green-100 text-green-700 border-green-400', danada: 'bg-yellow-100 text-yellow-700 border-yellow-400', perdida: 'bg-red-100 text-red-700 border-red-400', no_devuelta: 'bg-orange-100 text-orange-700 border-orange-400' };
  return m[estado] || '';
};

const etiquetaEstado = (estado) => {
  const m = { buena: 'Buena', danada: 'Dañada', perdida: 'Perdida', no_devuelta: 'No devuelta' };
  return m[estado] || estado;
};

const estiloInput = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-primary';

export default GestionCuadrillas;
