import { useState, useEffect } from 'react';
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
} from 'react-icons/md';
import Navbar from '../components/Navbar';
import { obtenerInventarioTotal } from '../services/herramientaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import {
  listarSolicitudesPorEmergencia,
  actualizarEstadoSolicitud,
} from '../services/solicitudService';

const BADGE_SOLICITUD = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobada:  'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
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
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Cargar inventario total al montar — sin filtros
  useEffect(() => {
    cargarInventario();
    obtenerEmergencias()
      .then((res) => {
        const lista = res.datos?.emergencias || res.datos || [];
        const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
        setEmergencias(activas);
        if (activas.length > 0) setEmergenciaId(String(activas[0].id));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!emergenciaId) return;
    cargarSolicitudes();
  }, [emergenciaId]);

  const cargarInventario = async () => {
    setCargandoInv(true);
    try {
      const res = await obtenerInventarioTotal();
      setInventario(res.datos || null);
    } catch {
      setError('Error al cargar el inventario');
    } finally {
      setCargandoInv(false);
    }
  };

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

  const handleResolver = async (id, estado) => {
    setGuardando(id);
    try {
      await actualizarEstadoSolicitud(id, estado, respuestaTexto[id] || null);
      setExito(`Solicitud ${estado === 'aprobada' ? 'aprobada' : 'rechazada'}`);
      setTimeout(() => setExito(''), 3000);
      await cargarSolicitudes();
    } catch {
      setError('Error al actualizar la solicitud');
    } finally {
      setGuardando(null);
    }
  };

  const solicitudesPendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const solicitudesResueltas  = solicitudes.filter((s) => s.estado !== 'pendiente');

  return (
    <div className="min-h-screen bg-techo-light">
      <Navbar />

      <div className="pt-[76px]">
        {/* Header — sin selector de emergencia */}
        <div className="bg-techo-primary shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
            <MdInventory className="text-techo-secondary text-2xl flex-shrink-0" />
            <h1 className="text-white font-bold text-lg tracking-tight">Inventario General</h1>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

          {/* Mensajes */}
          {error && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-techo-danger/40 rounded-xl">
              <MdError className="text-techo-danger text-xl flex-shrink-0" />
              <p className="text-red-800 text-sm flex-1">{error}</p>
              <button onClick={() => setError('')}><MdClose className="text-red-400" /></button>
            </div>
          )}
          {exito && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-techo-success/40 rounded-xl">
              <MdCheckCircle className="text-techo-success text-xl flex-shrink-0" />
              <p className="text-green-800 text-sm">{exito}</p>
            </div>
          )}

          {/* ── Inventario total — carga sin filtro ──────────────────────── */}
          {cargandoInv ? (
            <div className="flex items-center justify-center py-16 gap-2.5 text-gray-400">
              <div className="w-5 h-5 border-2 border-techo-secondary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Cargando inventario...</span>
            </div>
          ) : inventario ? (
            <div className="flex flex-col gap-4">
              {/* Stats globales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total herramientas', valor: inventario.totales?.total ?? 0,
                    grad: 'from-techo-primary to-techo-primaryDark' },
                  { label: 'En buen estado', valor: inventario.totales?.buenas ?? 0,
                    grad: 'from-techo-success to-emerald-700' },
                  { label: 'Dañadas', valor: inventario.totales?.danadas ?? 0,
                    grad: 'from-techo-accent to-orange-600' },
                  { label: 'Pérdidas / No dev.',
                    valor: (inventario.totales?.perdidas ?? 0) + (inventario.totales?.no_devueltas ?? 0),
                    grad: 'from-techo-danger to-red-700' },
                ].map(({ label, valor, grad }, i) => (
                  <div
                    key={label}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className={`animate-fadeInUp bg-gradient-to-br ${grad} rounded-2xl p-4 flex flex-col gap-2 shadow-md`}
                  >
                    <span className="text-white/70 text-xs font-semibold uppercase tracking-wide leading-snug">{label}</span>
                    <span className="text-3xl font-black text-white animate-countPop tabular-nums leading-none">{valor}</span>
                  </div>
                ))}
              </div>

              {/* Tabla todas las cuadrillas */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-techo-primary/5 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MdInventory className="text-techo-primary" />
                    <h2 className="font-semibold text-techo-primary text-sm">Existencias por cuadrilla</h2>
                  </div>
                  <button
                    onClick={cargarInventario}
                    className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-techo-primary hover:border-techo-primary transition"
                  >
                    <MdFilterList /> Actualizar
                  </button>
                </div>

                {inventario.resumen?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                    <MdBuild className="text-5xl mb-3 opacity-20" />
                    <p className="text-sm text-gray-500">No hay herramientas registradas en el sistema</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuadrilla</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Total</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-green-600 uppercase">Buenas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-orange-600 uppercase">Dañadas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-red-600 uppercase">Perdidas</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-purple-600 uppercase">No dev.</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventario.resumen.map((fila) => (
                          <tr
                            key={fila.cuadrilla_id}
                            className={`border-b border-gray-50 hover:bg-gray-50 transition ${fila.con_diferencias ? 'bg-red-50/60' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${fila.con_diferencias ? 'bg-techo-danger' : 'bg-techo-success'}`} />
                                <span className="font-medium text-gray-800">{fila.cuadrilla_nombre}</span>
                              </div>
                            </td>
                            <td className="text-center px-3 py-3 font-bold text-techo-primary">{fila.total}</td>
                            <td className="text-center px-3 py-3 text-green-700 font-semibold">{fila.buenas}</td>
                            <td className="text-center px-3 py-3 text-orange-700 font-semibold">{fila.danadas}</td>
                            <td className="text-center px-3 py-3 text-red-700 font-semibold">{fila.perdidas}</td>
                            <td className="text-center px-3 py-3 text-purple-700 font-semibold">{fila.no_devueltas}</td>
                            <td className="text-center px-3 py-3">
                              {fila.con_diferencias ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                  <MdWarning /> Alerta
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                  <MdCheckCircle /> OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-techo-primary/5 border-t-2 border-techo-primary/20">
                          <td className="px-4 py-2.5 text-xs font-bold text-techo-primary uppercase">Total general</td>
                          <td className="text-center px-3 py-2.5 font-bold text-techo-primary">{inventario.totales?.total ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-green-700">{inventario.totales?.buenas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-orange-700">{inventario.totales?.danadas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-red-700">{inventario.totales?.perdidas ?? 0}</td>
                          <td className="text-center px-3 py-2.5 font-bold text-purple-700">{inventario.totales?.no_devueltas ?? 0}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ── Solicitudes — sí necesita filtro por emergencia ───────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-techo-accent/10 border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MdWarning className="text-techo-accent text-lg" />
                <h2 className="font-semibold text-gray-800 text-sm">
                  Solicitudes de herramientas y EPP
                  {solicitudesPendientes.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-techo-accent text-white text-xs font-bold rounded-full">
                      {solicitudesPendientes.length} pendiente{solicitudesPendientes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </h2>
              </div>
              {/* Selector de emergencia solo para esta sección */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Emergencia</label>
                <select
                  value={emergenciaId}
                  onChange={(e) => setEmergenciaId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-techo-secondary"
                >
                  {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
                  {emergencias.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
                <button onClick={cargarSolicitudes} className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-techo-primary hover:border-techo-primary transition">
                  <MdFilterList /> Actualizar
                </button>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {!emergenciaId ? (
                <p className="text-gray-400 text-sm text-center py-6">Selecciona una emergencia para ver sus solicitudes</p>
              ) : cargandoSol ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-techo-secondary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Cargando solicitudes...</span>
                </div>
              ) : solicitudes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <MdCheckCircle className="text-4xl mb-2 opacity-30" />
                  <p className="text-sm text-gray-500">No hay solicitudes para esta emergencia</p>
                </div>
              ) : (
                <>
                  {solicitudesPendientes.map((s) => (
                    <div key={s.id} className="border border-yellow-200 bg-yellow-50/50 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.tipo === 'epp' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {s.tipo === 'epp' ? 'EPP' : 'Herramienta'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">Pendiente</span>
                        <p className="text-gray-800 text-sm w-full">{s.descripcion}</p>
                      </div>
                      <input
                        type="text"
                        placeholder="Respuesta al jefe (opcional)"
                        value={respuestaTexto[s.id] || ''}
                        onChange={(e) => setRespuestaTexto((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-techo-secondary"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleResolver(s.id, 'aprobada')} disabled={guardando === s.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-techo-success text-white text-xs font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-60">
                          <MdThumbUp /> Aprobar
                        </button>
                        <button onClick={() => handleResolver(s.id, 'rechazada')} disabled={guardando === s.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-techo-danger text-white text-xs font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-60">
                          <MdThumbDown /> Rechazar
                        </button>
                      </div>
                    </div>
                  ))}

                  {solicitudesResueltas.length > 0 && (
                    <div className="mt-2">
                      {solicitudesResueltas.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.tipo === 'epp' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {s.tipo === 'epp' ? 'EPP' : 'Herramienta'}
                            </span>
                            <span className="text-gray-700 text-xs">{s.descripcion}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${BADGE_SOLICITUD[s.estado]}`}>
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
    </div>
  );
}
