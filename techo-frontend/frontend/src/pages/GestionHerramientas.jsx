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
} from 'react-icons/md';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import {
  obtenerHerramientas,
  registrarHerramienta,
  registrarHerramientasMasivas,
  actualizarEstadoHerramienta,
  obtenerBalance,
  cerrarBalanceDia,
} from '../services/herramientaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import { obtenerCuadrillasPorEmergencia } from '../services/cuadrillaService';

const ESTILOS_ESTADO = {
  entregada: {
    borde: 'border-techo-secondary',
    badge: 'bg-blue-100 text-blue-800',
    punto: 'bg-techo-secondary',
    etiqueta: 'Entregada',
  },
  buena: {
    borde: 'border-techo-success',
    badge: 'bg-green-100 text-green-800',
    punto: 'bg-techo-success',
    etiqueta: 'Buena',
  },
  danada: {
    borde: 'border-techo-accent',
    badge: 'bg-orange-100 text-orange-800',
    punto: 'bg-techo-accent',
    etiqueta: 'Dañada',
  },
  perdida: {
    borde: 'border-techo-danger',
    badge: 'bg-red-100 text-red-800',
    punto: 'bg-techo-danger',
    etiqueta: 'Perdida',
  },
  no_devuelta: {
    borde: 'border-purple-500',
    badge: 'bg-purple-100 text-purple-800',
    punto: 'bg-purple-500',
    etiqueta: 'No devuelta',
  },
};

const BALANCE_STATS = [
  { clave: 'entregadas', etiqueta: 'Entregadas', clasesPunto: 'bg-techo-secondary', clasesTexto: 'text-blue-700', clasesFila: 'bg-blue-50' },
  { clave: 'buenas', etiqueta: 'Buenas', clasesPunto: 'bg-techo-success', clasesTexto: 'text-green-700', clasesFila: 'bg-green-50' },
  { clave: 'danadas', etiqueta: 'Dañadas', clasesPunto: 'bg-techo-accent', clasesTexto: 'text-orange-700', clasesFila: 'bg-orange-50' },
  { clave: 'perdidas', etiqueta: 'Perdidas', clasesPunto: 'bg-techo-danger', clasesTexto: 'text-red-700', clasesFila: 'bg-red-50' },
  { clave: 'no_devueltas', etiqueta: 'No devueltas', clasesPunto: 'bg-purple-500', clasesTexto: 'text-purple-700', clasesFila: 'bg-purple-50' },
];

export default function GestionHerramientas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';
  const puedeEditar = esCoordinador || esJefe;

  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [cuadrillaId, setCuadrillaId] = useState('');

  const [herramientas, setHerramientas] = useState([]);
  const [balance, setBalance] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modoRegistro, setModoRegistro] = useState('individual');
  const [nombreHerramienta, setNombreHerramienta] = useState('');
  const [nombresMultiples, setNombresMultiples] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [observaciones, setObservaciones] = useState('');

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
    obtenerCuadrillasPorEmergencia(emergenciaId)
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

  const cargarHerramientas = async () => {
    setCargando(true);
    try {
      const res = await obtenerHerramientas(cuadrillaId);
      setHerramientas(res.datos?.herramientas || []);
    } catch {
      setError('Error al cargar herramientas');
    } finally {
      setCargando(false);
    }
  };

  const cargarBalance = async () => {
    try {
      const res = await obtenerBalance(cuadrillaId);
      setBalance(res.datos?.balance || null);
    } catch {
      // El balance puede no existir si no hay herramientas aun
    }
  };

  const mostrarExito = (msg) => {
    setExito(msg);
    setTimeout(() => setExito(''), 3500);
  };

  const handleRegistrarIndividual = async () => {
    if (!nombreHerramienta.trim()) return;
    setGuardando(true);
    const res = await registrarHerramienta(cuadrillaId, nombreHerramienta.trim());
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setNombreHerramienta('');
      await cargarHerramientas();
      await cargarBalance();
      mostrarExito('Herramienta registrada');
    } else {
      setError(res.mensaje || 'Error al registrar');
    }
  };

  const handleRegistrarMasivo = async () => {
    const nombres = nombresMultiples
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (nombres.length === 0) return;
    setGuardando(true);
    const res = await registrarHerramientasMasivas(cuadrillaId, nombres);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setNombresMultiples('');
      await cargarHerramientas();
      await cargarBalance();
      mostrarExito(`${nombres.length} herramientas registradas`);
    } else {
      setError(res.mensaje || 'Error al registrar');
    }
  };

  const handleGuardarEstado = async (herramientaId) => {
    if (!nuevoEstado) return;
    setGuardando(true);
    const res = await actualizarEstadoHerramienta(herramientaId, nuevoEstado, observaciones);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setEditandoId(null);
      setNuevoEstado('');
      setObservaciones('');
      await cargarHerramientas();
      await cargarBalance();
      mostrarExito('Estado actualizado');
    } else {
      setError(res.mensaje || 'Error al actualizar');
    }
  };

  const handleCerrarBalance = async () => {
    if (!window.confirm('¿Cerrar el balance del día? Si hay herramientas dañadas o perdidas se activará una alerta en el mapa.')) return;
    setGuardando(true);
    const res = await cerrarBalanceDia(cuadrillaId);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      await cargarBalance();
      mostrarExito('Balance cerrado. Las alertas han sido actualizadas en el mapa.');
    } else {
      setError(res.mensaje || 'Error al cerrar balance');
    }
  };

  const herramientasFiltradas = filtroEstado === 'todos'
    ? herramientas
    : herramientas.filter((h) => h.estado === filtroEstado);

  const cuadrillaActual = cuadrillas.find((c) => String(c.id) === cuadrillaId);

  return (
    <div className="min-h-screen bg-techo-light">
      <Navbar />

      {/* ── Cabecera ──────────────────────────────────────────────────────── */}
      <div className="pt-[76px]">
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
                onChange={(e) => {
                  setEmergenciaId(e.target.value);
                  setCuadrillaId('');
                  setHerramientas([]);
                  setBalance(null);
                }}
                className="bg-white/10 text-white border border-white/25 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary min-w-[160px]"
              >
                {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
                {emergencias.map((e) => (
                  <option key={e.id} value={e.id} className="text-gray-800 bg-white">{e.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-white/60 text-xs font-medium whitespace-nowrap">Cuadrilla</label>
              <select
                value={cuadrillaId}
                onChange={(e) => setCuadrillaId(e.target.value)}
                className="bg-white/10 text-white border border-white/25 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary min-w-[160px]"
              >
                {cuadrillas.length === 0 && <option value="">Sin cuadrillas</option>}
                {cuadrillas.map((c) => (
                  <option key={c.id} value={c.id} className="text-gray-800 bg-white">{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Contenido principal ────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* Mensajes */}
          {error && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-red-50 border border-techo-danger/40 rounded-xl animate-fadeIn">
              <MdError className="text-techo-danger text-xl flex-shrink-0" />
              <p className="text-red-800 text-sm flex-1">{error}</p>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 transition">
                <MdClose />
              </button>
            </div>
          )}
          {exito && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-green-50 border border-techo-success/40 rounded-xl animate-fadeIn">
              <MdCheckCircle className="text-techo-success text-xl flex-shrink-0" />
              <p className="text-green-800 text-sm">{exito}</p>
            </div>
          )}

          {cuadrillaId ? (
            <div className="flex gap-5 flex-wrap lg:flex-nowrap items-start">

              {/* ── Columna izquierda ──────────────────────────────────── */}
              <div className="flex flex-col gap-5 w-full lg:w-72 flex-shrink-0">

                {/* Balance del día */}
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
                        {puedeEditar && (
                          <button
                            onClick={handleCerrarBalance}
                            disabled={guardando}
                            className="mt-3 w-full py-2 bg-techo-primary hover:bg-techo-primaryDark text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {guardando ? 'Cerrando...' : 'Cerrar balance del día'}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400 text-sm text-center py-4">Sin herramientas registradas aún.</p>
                    )}
                  </div>
                </div>

                {/* Registro de herramientas */}
                {puedeEditar && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-techo-primary/5 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                      <MdAddCircle className="text-techo-primary text-lg" />
                      <h2 className="font-semibold text-techo-primary text-sm">Registrar herramientas</h2>
                    </div>
                    <div className="p-4">
                      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
                        {['individual', 'masivo'].map((modo) => (
                          <button
                            key={modo}
                            onClick={() => setModoRegistro(modo)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                              modoRegistro === modo
                                ? 'bg-techo-primary text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {modo}
                          </button>
                        ))}
                      </div>

                      {modoRegistro === 'individual' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={nombreHerramienta}
                            onChange={(e) => setNombreHerramienta(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRegistrarIndividual()}
                            placeholder="Nombre de la herramienta"
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary"
                          />
                          <button
                            onClick={handleRegistrarIndividual}
                            disabled={guardando}
                            className="px-4 py-2 bg-techo-success text-white text-sm font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-60"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={nombresMultiples}
                            onChange={(e) => setNombresMultiples(e.target.value)}
                            rows={4}
                            placeholder={"Un nombre por línea o separados por coma:\nmartillo\npala\nnivel"}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary resize-y"
                          />
                          <button
                            onClick={handleRegistrarMasivo}
                            disabled={guardando}
                            className="w-full py-2 bg-techo-success text-white text-sm font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-60"
                          >
                            {guardando ? 'Registrando...' : 'Registrar todas'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Columna derecha: lista de herramientas ─────────────── */}
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-techo-primary/5 border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <MdBuild className="text-techo-primary" />
                      <h2 className="font-semibold text-techo-primary text-sm">
                        {cuadrillaActual?.nombre}
                        <span className="font-normal text-gray-400 ml-1.5">· {herramientas.length} herramientas</span>
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MdFilterList className="text-gray-400 text-base" />
                      <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-techo-secondary"
                      >
                        <option value="todos">Todos los estados</option>
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
                        <span className="text-sm">Cargando herramientas...</span>
                      </div>
                    )}

                    {!cargando && herramientasFiltradas.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                        <MdBuild className="text-5xl mb-3 opacity-20" />
                        <p className="text-sm font-medium text-gray-500">No hay herramientas</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {filtroEstado === 'todos' ? 'Registra la primera herramienta para comenzar.' : 'No hay herramientas con este estado.'}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {herramientasFiltradas.map((h) => {
                        const estilos = ESTILOS_ESTADO[h.estado] || ESTILOS_ESTADO.entregada;
                        const estaEditando = editandoId === h.id;
                        return (
                          <div
                            key={h.id}
                            className={`border-l-4 ${estilos.borde} bg-gray-50 rounded-r-xl p-3 transition`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-gray-800 font-medium text-sm">{h.nombre}</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${estilos.badge}`}>
                                  {estilos.etiqueta}
                                </span>
                                {puedeEditar && (h.estado === 'entregada' || h.estado === 'buena') && (
                                  <button
                                    onClick={() => {
                                      setEditandoId(estaEditando ? null : h.id);
                                      setNuevoEstado('danada');
                                      setObservaciones('');
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-semibold transition"
                                  >
                                    <MdWarning className="text-sm" /> Marcar daño
                                  </button>
                                )}
                              </div>
                            </div>

                            {h.observaciones && (
                              <p className="text-xs text-gray-500 mt-1.5 italic">Obs: {h.observaciones}</p>
                            )}

                            {estaEditando && (
                              <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 flex flex-col gap-2">
                                <select
                                  value={nuevoEstado}
                                  onChange={(e) => setNuevoEstado(e.target.value)}
                                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary"
                                >
                                  <option value="buena">Buena — devuelta en buen estado</option>
                                  <option value="danada">Dañada — presenta daños</option>
                                  <option value="perdida">Perdida — no se encontró</option>
                                  <option value="no_devuelta">No devuelta — pendiente</option>
                                </select>
                                <input
                                  type="text"
                                  value={observaciones}
                                  onChange={(e) => setObservaciones(e.target.value)}
                                  placeholder="Observaciones (opcional)"
                                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-techo-secondary"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleGuardarEstado(h.id)}
                                    disabled={guardando}
                                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-techo-primary text-white text-xs font-bold rounded-lg hover:bg-techo-primaryDark transition disabled:opacity-60"
                                  >
                                    <MdSave /> Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditandoId(null)}
                                    className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            !cargando && (
              <div className="flex flex-col items-center justify-center py-28 text-gray-400">
                <MdBuild className="text-7xl mb-4 opacity-20" />
                <p className="text-base font-medium text-gray-500">Selecciona una emergencia y cuadrilla</p>
                <p className="text-sm text-gray-400 mt-1">para ver y gestionar sus herramientas</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
