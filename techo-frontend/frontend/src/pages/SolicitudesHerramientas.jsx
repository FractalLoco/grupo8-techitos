import { useState, useEffect, useCallback } from 'react';
import {
  MdSend,
  MdCheckCircle,
  MdCancel,
  MdError,
  MdRefresh,
  MdWarning,
  MdOutlineAssignment,
  MdAdd,
  MdClose,
  MdSchedule,
  MdBuild,
} from 'react-icons/md';
import { FaWrench, FaHardHat, FaBoxes } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerEmergencias } from '../services/emergenciaService';
import {
  crearSolicitud,
  listarTodasSolicitudes,
  listarMisSolicitudes,
  listarSolicitudesPorEmergencia,
  listarSolicitudesPorCuadrilla,
  actualizarEstadoSolicitud,
} from '../services/solicitudService';
import { consultarStockDisponible } from '../services/movimientoService';
import { listarCuadrillasConEstado } from '../services/cuadrillaService';

const TIPO_OPTS = [
  { value: 'herramienta', label: 'Herramienta',  icon: <FaWrench className="text-xs" /> },
  { value: 'epp',         label: 'EPP',           icon: <FaHardHat className="text-xs" /> },
  { value: 'material',    label: 'Material',      icon: <FaBoxes className="text-xs" /> },
  { value: 'otro',        label: 'Otro',          icon: <MdBuild className="text-xs" /> },
];

const BADGE = {
  pendiente: 'bg-tertiary/10 text-tertiary border-tertiary/30',
  aprobada:  'bg-secondary/10  text-secondary  border-secondary/30',
  rechazada: 'bg-error-container    text-on-error-container    border-error/30',
};

const formVacio = { cuadrillaId: '', emergenciaId: '', tipo: 'herramienta', nombre_item: '', cantidad: 1, descripcion: '' };
const estiloInput = 'w-full border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

export default function SolicitudesHerramientas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe        = usuario?.rol === 'jefe_cuadrilla';

  const [emergencias,  setEmergencias]  = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas,   setCuadrillas]   = useState([]);
  const [solicitudes,  setSolicitudes]  = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [toast,        setToast]        = useState(null);
  const [guardando,    setGuardando]    = useState(null);
  const [respuestaTexto, setRespuestaTexto] = useState({});
  const [mostrarForm,  setMostrarForm]  = useState(false);
  const [form,         setForm]         = useState(formVacio);
  const [enviando,     setEnviando]     = useState(false);
  const [stockMap,     setStockMap]     = useState({});

  const mostrarToast = (tipo, texto) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    obtenerEmergencias()
      .then((res) => {
        const lista = res.datos?.emergencias || res.datos || [];
        const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
        setEmergencias(activas);
        if (activas.length > 0) {
          const id = String(activas[0].id);
          setEmergenciaId(id);
          setForm((f) => ({ ...f, emergenciaId: id }));
        }
      })
      .catch(() => {});
  }, []);

  // Carga cuadrillas para el formulario: el coordinador ve todas, el jefe solo las suyas
  useEffect(() => {
    if ((!esJefe && !esCoordinador) || !emergenciaId) return;
    listarCuadrillasConEstado(emergenciaId)
      .then((res) => {
        const lista = res.datos?.cuadrillas || [];
        const filtradas = esJefe ? lista.filter((c) => c.jefe_id === usuario?.id) : lista;
        setCuadrillas(filtradas);
        if (filtradas.length > 0) setForm((f) => ({ ...f, cuadrillaId: String(filtradas[0].id) }));
      })
      .catch(() => {});
  }, [emergenciaId, esJefe, esCoordinador, usuario?.id]);

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    try {
      let res;
      if (esCoordinador && emergenciaId) {
        res = await listarSolicitudesPorEmergencia(emergenciaId);
      } else if (esCoordinador) {
        res = await listarTodasSolicitudes();
      } else if (esJefe) {
        res = await listarMisSolicitudes();
      } else {
        setSolicitudes([]);
        return;
      }
      setSolicitudes(res.datos?.solicitudes || []);
    } catch {
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  }, [emergenciaId, esCoordinador, esJefe]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  // Coordinador: consulta stock disponible de cada ítem único en solicitudes pendientes
  useEffect(() => {
    if (!esCoordinador) return;
    const pendientesConItem = solicitudes.filter((s) => s.estado === 'pendiente' && s.nombre_item);
    const itemsUnicos = [...new Map(pendientesConItem.map((s) => [`${s.nombre_item}|${s.tipo}`, s])).values()];
    itemsUnicos.forEach(async (sol) => {
      const clave = `${sol.nombre_item}|${sol.tipo}`;
      try {
        const res = await consultarStockDisponible(sol.nombre_item, sol.tipo);
        const disponible = res.datos?.disponible ?? 0;
        setStockMap((prev) => ({ ...prev, [clave]: disponible }));
      } catch {
        setStockMap((prev) => ({ ...prev, [clave]: null }));
      }
    });
  }, [solicitudes, esCoordinador]);

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!form.nombre_item.trim()) return mostrarToast('error', 'Ingresa el nombre del ítem');
    if (!form.cuadrillaId)        return mostrarToast('error', 'Selecciona una cuadrilla');
    if (!form.emergenciaId)       return mostrarToast('error', 'Selecciona una emergencia');
    setEnviando(true);
    try {
      await crearSolicitud({
        cuadrillaId:  Number(form.cuadrillaId),
        emergenciaId: Number(form.emergenciaId),
        tipo:         form.tipo,
        nombre_item:  form.nombre_item.trim(),
        cantidad:     Number(form.cantidad) || 1,
        descripcion:  form.descripcion.trim() || `Solicitud de ${form.tipo}: ${form.nombre_item}`,
      });
      mostrarToast('exito', 'Solicitud enviada al coordinador');
      setForm({ ...formVacio, emergenciaId: form.emergenciaId, cuadrillaId: form.cuadrillaId });
      setMostrarForm(false);
      cargarSolicitudes();
    } catch (err) {
      mostrarToast('error', err.response?.data?.mensaje || err.message || 'Error al enviar solicitud');
    } finally {
      setEnviando(false);
    }
  };

  const handleResolver = async (id, estado) => {
    setGuardando(id);
    try {
      await actualizarEstadoSolicitud(id, estado, respuestaTexto[id] || null);
      const accion = estado === 'aprobada' ? 'aprobada (salida registrada automáticamente)' : 'rechazada';
      mostrarToast('exito', `Solicitud ${accion}`);
      setRespuestaTexto((prev) => { const next = { ...prev }; delete next[id]; return next; });
      cargarSolicitudes();
    } catch (err) {
      mostrarToast('error', err.response?.data?.mensaje || err.message || 'Error al procesar');
    } finally {
      setGuardando(null);
    }
  };

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const procesadas = solicitudes.filter((s) => s.estado !== 'pendiente');

  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="min-h-screen bg-surface-container-low">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-[122px] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold animate-fadeIn ${
          toast.tipo === 'exito' ? 'bg-secondary text-white' : 'bg-error text-white'
        }`}>
          {toast.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
          {toast.texto}
        </div>
      )}

      <div className="pt-[60px]">
        {/* Header */}
        <div className="bg-primary shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-1">
              <MdOutlineAssignment className="text-primary text-2xl flex-shrink-0" />
              <h1 className="text-white font-bold text-lg tracking-tight">Solicitudes de Herramientas</h1>
            </div>

            {esCoordinador && (
              <div className="flex items-center gap-1.5">
                <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
                <select
                  className="bg-white/10 text-white border border-white/25 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[190px]"
                  value={emergenciaId}
                  onChange={(e) => setEmergenciaId(e.target.value)}
                >
                  <option value="" className="text-on-surface bg-white">— Todas —</option>
                  {emergencias.map((em) => (
                    <option key={em.id} value={em.id} className="text-on-surface bg-white">{em.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={cargarSolicitudes}
              className="ml-auto p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Actualizar"
            >
              <MdRefresh className={cargando ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">

          {/* ── SECCIÓN 1: Mis solicitudes / pendientes destacadas ── */}
          {pendientes.length > 0 && (
            <div className="bg-tertiary/5 border-l-4 border-tertiary/50 rounded-xl p-4 flex items-start gap-3">
              <MdWarning className="text-tertiary-container text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-tertiary text-sm">
                  {esCoordinador
                    ? `${pendientes.length} solicitud${pendientes.length > 1 ? 'es' : ''} pendiente${pendientes.length > 1 ? 's' : ''} de respuesta`
                    : `${pendientes.length} solicitud${pendientes.length > 1 ? 'es' : ''} en espera de aprobación`}
                </p>
                <p className="text-tertiary text-xs mt-0.5">
                  {esCoordinador ? 'Revisalas abajo — al aprobar, la salida del inventario se registra automáticamente.' : 'El coordinador las revisará pronto.'}
                </p>
              </div>
            </div>
          )}

          {/* ── PENDIENTES (coordinador: puede resolver | jefe: solo ver) ── */}
          {pendientes.length > 0 && (
            <div className="bg-white rounded-xl border border-outline-variant/60 overflow-hidden shadow-card">
              <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-tertiary-container text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">!</span>
                <h2 className="font-semibold text-on-surface text-sm">Pendientes</h2>
                <span className="ml-auto text-xs text-outline">{pendientes.length}</span>
              </div>

              <div className="divide-y divide-outline-variant/60">
                {pendientes.map((sol) => {
                  const tipoOpt = TIPO_OPTS.find((o) => o.value === sol.tipo);
                  return (
                    <div key={sol.id} className="px-4 py-4">
                      {/* Encabezado: badge + tipo + nombre_item + fecha */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE[sol.estado]}`}>
                            {sol.estado}
                          </span>
                          {tipoOpt && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant capitalize">
                              {tipoOpt.icon} {sol.tipo}
                            </span>
                          )}
                          {sol.nombre_item && (
                            <span className="text-sm font-bold text-primary">"{sol.nombre_item}"</span>
                          )}
                          {(sol.cantidad ?? 1) > 1 && (
                            <span className="text-xs text-on-surface-variant font-medium">× {sol.cantidad}</span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-[10px] text-outline flex-shrink-0">
                          <MdSchedule className="text-xs" /> {formatFecha(sol.fecha_creacion)}
                        </span>
                      </div>

                      {/* Bloque de detalles: motivo, destino, quién solicitó */}
                      <div className="bg-surface-container-low rounded-xl px-3 py-2.5 mb-3 flex flex-col gap-1.5">
                        {sol.descripcion && (
                          <div className="flex gap-2">
                            <span className="text-[10px] font-semibold text-outline uppercase w-16 flex-shrink-0 pt-0.5">Motivo</span>
                            <span className="text-xs text-on-surface">{sol.descripcion}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-[10px] font-semibold text-outline uppercase w-16 flex-shrink-0 pt-0.5">Destino</span>
                          <span className="text-xs">
                            <span className="font-semibold text-primary">
                              {sol.cuadrilla?.nombre ?? `Cuadrilla #${sol.cuadrilla_id}`}
                            </span>
                            {sol.emergencia?.nombre && (
                              <span className="text-outline"> · {sol.emergencia.nombre}</span>
                            )}
                          </span>
                        </div>
                        {esCoordinador && sol.jefe?.nombre && (
                          <div className="flex gap-2">
                            <span className="text-[10px] font-semibold text-outline uppercase w-16 flex-shrink-0 pt-0.5">De</span>
                            <span className="text-xs text-on-surface">{sol.jefe.nombre}</span>
                          </div>
                        )}
                      </div>

                      {/* Coordinador: aprobar o rechazar */}
                      {esCoordinador && (
                        <div className="flex flex-col gap-2">
                          {/* Indicador de stock disponible */}
                          {sol.nombre_item && (() => {
                            const clave = `${sol.nombre_item}|${sol.tipo}`;
                            const stock = stockMap[clave];
                            const necesita = sol.cantidad || 1;
                            if (stock === undefined) return null;
                            const color = stock === null
                              ? 'bg-surface-container text-on-surface-variant'
                              : stock >= necesita
                                ? 'bg-secondary/5 border-secondary/30 text-secondary'
                                : stock > 0
                                  ? 'bg-tertiary/5 border-tertiary/30 text-tertiary'
                                  : 'bg-error-container/40 border-error/30 text-error';
                            return (
                              <div className={`flex items-center justify-between rounded-xl px-3 py-2 border text-xs ${color}`}>
                                <span className="font-semibold">Stock disponible en almacén</span>
                                <span className="font-bold text-sm">
                                  {stock === null ? '—' : `${stock} ud.`}
                                </span>
                                {stock !== null && stock < necesita && (
                                  <span className="text-[10px] font-medium ml-2">⚠ pide {necesita}, hay {stock}</span>
                                )}
                              </div>
                            );
                          })()}
                          <textarea
                            className="w-full border border-outline-variant rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            rows={2}
                            placeholder="Respuesta opcional (ej: se enviarán mañana, stock insuficiente…)"
                            value={respuestaTexto[sol.id] || ''}
                            onChange={(e) => setRespuestaTexto((prev) => ({ ...prev, [sol.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={guardando === sol.id}
                              onClick={() => handleResolver(sol.id, 'aprobada')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary hover:bg-secondary/90 text-white text-xs font-bold transition disabled:opacity-60"
                            >
                              <MdCheckCircle /> Aprobar{sol.nombre_item ? ' y registrar salida' : ''}
                            </button>
                            <button
                              disabled={guardando === sol.id}
                              onClick={() => handleResolver(sol.id, 'rechazada')}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-error-container hover:bg-error-container text-on-error-container text-xs font-bold transition disabled:opacity-60"
                            >
                              <MdCancel /> Rechazar
                            </button>
                          </div>
                          {sol.nombre_item && (
                            <p className="text-[10px] text-secondary font-medium">
                              ✓ Al aprobar: "{sol.nombre_item}" (×{sol.cantidad || 1}) se registrará automáticamente como salida del inventario.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PROCESADAS (historial) ── */}
          {procesadas.length > 0 && (
            <div className="bg-white rounded-xl border border-outline-variant/60 overflow-hidden shadow-card">
              <div className="px-4 py-3 border-b border-outline-variant/60 flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">✓</span>
                <h2 className="font-semibold text-on-surface text-sm">Historial</h2>
                <span className="ml-auto text-xs text-outline">{procesadas.length}</span>
              </div>

              <div className="divide-y divide-outline-variant/60">
                {procesadas.map((sol) => {
                  const tipoOpt = TIPO_OPTS.find((o) => o.value === sol.tipo);
                  return (
                    <div key={sol.id} className="px-4 py-3 flex flex-wrap items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE[sol.estado]}`}>
                            {sol.estado}
                          </span>
                          {tipoOpt && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant capitalize">
                              {tipoOpt.icon} {sol.tipo}
                            </span>
                          )}
                          {sol.nombre_item && (
                            <span className="text-xs text-on-surface-variant">"{sol.nombre_item}" ×{sol.cantidad || 1}</span>
                          )}
                        </div>
                        {sol.descripcion && (
                          <p className="text-xs text-on-surface-variant mt-1">{sol.descripcion}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          <span className="text-[10px] font-semibold text-primary">
                            {sol.cuadrilla?.nombre ?? `Cuadrilla #${sol.cuadrilla_id}`}
                          </span>
                          {sol.emergencia?.nombre && (
                            <span className="text-[10px] text-outline">{sol.emergencia.nombre}</span>
                          )}
                          {esCoordinador && sol.jefe?.nombre && (
                            <span className="text-[10px] text-outline">Por: {sol.jefe.nombre}</span>
                          )}
                        </div>
                        {sol.respuesta && (
                          <p className="text-xs text-on-surface-variant italic mt-0.5">Resp.: {sol.respuesta}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-outline whitespace-nowrap">{formatFecha(sol.fecha_creacion)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!cargando && solicitudes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-outline">
              <MdOutlineAssignment className="text-6xl mb-3 opacity-20" />
              <p className="text-sm font-medium text-on-surface-variant">No hay solicitudes{esCoordinador ? '' : ' tuyas'} registradas</p>
            </div>
          )}
        </div>
      </div>

      {/* FAB jefe: nueva solicitud */}
      {(esJefe || esCoordinador) && !mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="fixed bottom-6 right-6 z-[400] flex items-center gap-2.5 px-5 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm active:scale-95"
        >
          <MdAdd className="text-xl" /> Nueva solicitud
        </button>
      )}

      {/* Modal nueva solicitud (jefe) */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <MdOutlineAssignment className="text-primary text-xl" />
                <div>
                  <h2 className="font-bold text-on-surface text-sm leading-tight">Nueva solicitud</h2>
                  <p className="text-xs text-outline mt-0.5">
                    {esCoordinador
                      ? 'Solicitud en nombre de una cuadrilla — se registrará con tu usuario'
                      : 'El coordinador recibirá tu pedido y lo aprobará o rechazará'}
                  </p>
                </div>
              </div>
              <button onClick={() => setMostrarForm(false)} className="text-outline hover:text-on-surface-variant transition ml-2 flex-shrink-0">
                <MdClose className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleCrear} className="p-5 overflow-y-auto flex flex-col gap-4">
              {/* Paso 1: Tipo */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">① Tipo de ítem</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPO_OPTS.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition ${
                        form.tipo === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                      }`}
                    >
                      <input type="radio" className="sr-only" checked={form.tipo === t.value} onChange={() => setForm({ ...form, tipo: t.value })} />
                      {t.icon} {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Paso 2: Ítem + cantidad */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">② ¿Qué necesitas?</label>
                <div className="flex gap-2">
                  <input
                    required
                    className={`${estiloInput} flex-1`}
                    placeholder="Ej: Martillo de goma, Casco EPP…"
                    value={form.nombre_item}
                    onChange={(e) => setForm({ ...form, nombre_item: e.target.value })}
                  />
                  <input
                    type="number"
                    min={1}
                    max={999}
                    className="w-20 border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-center"
                    value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                    title="Cantidad"
                  />
                </div>
                <p className="text-[10px] text-outline mt-1">Nombre exacto del ítem · Cantidad requerida</p>
              </div>

              {/* Paso 3: Emergencia (si hay más de una) */}
              {emergencias.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">③ Emergencia</label>
                  <select
                    className={estiloInput}
                    value={form.emergenciaId}
                    onChange={(e) => setForm({ ...form, emergenciaId: e.target.value })}
                  >
                    {emergencias.map((em) => (
                      <option key={em.id} value={em.id}>{em.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cuadrilla: el coordinador siempre la elige; el jefe solo si tiene más de una */}
              {(esCoordinador ? cuadrillas.length > 0 : cuadrillas.length > 1) && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Cuadrilla</label>
                  <select
                    className={estiloInput}
                    value={form.cuadrillaId}
                    onChange={(e) => setForm({ ...form, cuadrillaId: e.target.value })}
                  >
                    {cuadrillas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Descripción adicional */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Motivo / detalles</label>
                <textarea
                  className={`${estiloInput} resize-none`}
                  rows={2}
                  placeholder="¿Para qué se necesita? Ej: reemplazo de herramienta dañada…"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <MdSend /> {enviando ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
