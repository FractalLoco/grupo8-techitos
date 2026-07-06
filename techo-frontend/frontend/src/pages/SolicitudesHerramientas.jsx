import { useState, useEffect, useCallback } from 'react';
import {
  MdSend, MdCheckCircle, MdCancel, MdError, MdRefresh, MdWarning,
  MdOutlineAssignment, MdAdd, MdClose, MdSchedule, MdBuild,
} from 'react-icons/md';
import { FaWrench, FaHardHat, FaBoxes } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerEmergencias } from '../services/emergenciaService';
import {
  crearSolicitud, listarTodasSolicitudes, listarMisSolicitudes,
  listarSolicitudesPorEmergencia, listarSolicitudesPorAprobar, actualizarEstadoSolicitud,
} from '../services/solicitudService';
import { consultarStockDisponible } from '../services/movimientoService';
import { listarCuadrillasConEstado } from '../services/cuadrillaService';
import { obtenerCatalogoInventario } from '../services/herramientaService';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import Input from '../components/ui/Input';

const TIPO_OPTS = [
  { value: 'herramienta', label: 'Herramienta', icon: <FaWrench className="text-xs" /> },
  { value: 'epp', label: 'EPP', icon: <FaHardHat className="text-xs" /> },
  { value: 'material', label: 'Material', icon: <FaBoxes className="text-xs" /> },
  { value: 'otro', label: 'Otro', icon: <MdBuild className="text-xs" /> },
];

const BADGE_ESTADO = {
  pendiente: 'badge-yellow',
  aprobada: 'badge-green',
  rechazada: 'badge-red',
};

const formVacio = { cuadrillaId: '', emergenciaId: '', tipo: 'herramienta', nombre_item: '', cantidad: 1, descripcion: '' };

export default function SolicitudesHerramientas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';
  const esVoluntario = usuario?.rol === 'voluntario';
  const puedeAprobar = esCoordinador || esJefe;

  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [respuestaTexto, setRespuestaTexto] = useState({});
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [enviando, setEnviando] = useState(false);
  const [stockMap, setStockMap] = useState({});
  const [catalogo, setCatalogo] = useState([]);

  const mostrarToast = (tipo, texto) => { setToast({ tipo, texto }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    obtenerCatalogoInventario().then((res) => setCatalogo(res.datos?.catalogo || [])).catch(() => {});
  }, []);

  useEffect(() => {
    obtenerEmergencias().then((res) => {
      const lista = res.datos?.emergencias || res.datos || [];
      const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
      setEmergencias(activas);
      if (activas.length > 0) {
        const id = String(activas[0].id);
        setEmergenciaId(id);
        setForm((f) => ({ ...f, emergenciaId: id }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if ((!esJefe && !esCoordinador) || !emergenciaId) return;
    listarCuadrillasConEstado(emergenciaId).then((res) => {
      const lista = res.datos?.cuadrillas || [];
      const filtradas = esJefe ? lista.filter((c) => c.jefe_id === usuario?.id) : lista;
      setCuadrillas(filtradas);
      if (filtradas.length > 0) setForm((f) => ({ ...f, cuadrillaId: String(filtradas[0].id) }));
    }).catch(() => {});
  }, [emergenciaId, esJefe, esCoordinador, usuario?.id]);

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    try {
      let res;
      if (esCoordinador && emergenciaId) res = await listarSolicitudesPorEmergencia(emergenciaId);
      else if (esCoordinador) res = await listarTodasSolicitudes();
      else if (esJefe) res = await listarSolicitudesPorAprobar();
      else if (esVoluntario) res = await listarMisSolicitudes();
      else { setSolicitudes([]); return; }
      setSolicitudes(res.datos?.solicitudes || []);
    } catch { setSolicitudes([]); } finally { setCargando(false); }
  }, [emergenciaId, esCoordinador, esJefe, esVoluntario]);

  useEffect(() => { cargarSolicitudes(); }, [cargarSolicitudes]);

  useEffect(() => {
    if (!puedeAprobar) return;
    const pendientesConItem = solicitudes.filter((s) => s.estado === 'pendiente' && s.nombre_item);
    const itemsUnicos = [...new Map(pendientesConItem.map((s) => [`${s.nombre_item}|${s.tipo}`, s])).values()];
    itemsUnicos.forEach(async (sol) => {
      const clave = `${sol.nombre_item}|${sol.tipo}`;
      try {
        const res = await consultarStockDisponible(sol.nombre_item, sol.tipo);
        setStockMap((prev) => ({ ...prev, [clave]: res.datos?.disponible ?? 0 }));
      } catch { setStockMap((prev) => ({ ...prev, [clave]: null })); }
    });
  }, [solicitudes, puedeAprobar]);

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!form.nombre_item.trim()) return mostrarToast('error', 'Ingresa el nombre del ítem');
    // El voluntario no elige cuadrilla/emergencia: el backend las deriva de su membresía.
    if (!esVoluntario) {
      if (!form.cuadrillaId) return mostrarToast('error', 'Selecciona una cuadrilla');
      if (!form.emergenciaId) return mostrarToast('error', 'Selecciona una emergencia');
    }
    setEnviando(true);
    try {
      await crearSolicitud({
        ...(esVoluntario ? {} : { cuadrillaId: Number(form.cuadrillaId), emergenciaId: Number(form.emergenciaId) }),
        tipo: form.tipo, nombre_item: form.nombre_item.trim(),
        cantidad: Number(form.cantidad) || 1,
        descripcion: form.descripcion.trim() || `Solicitud de ${form.tipo}: ${form.nombre_item}`,
      });
      mostrarToast('success', esVoluntario ? 'Solicitud enviada a tu jefe/coordinador' : 'Solicitud enviada');
      setForm({ ...formVacio, emergenciaId: form.emergenciaId, cuadrillaId: form.cuadrillaId });
      setMostrarForm(false);
      cargarSolicitudes();
    } catch (err) { mostrarToast('error', err.response?.data?.mensaje || err.message || 'Error al enviar solicitud'); }
    finally { setEnviando(false); }
  };

  const handleResolver = async (id, estado) => {
    setGuardando(id);
    try {
      await actualizarEstadoSolicitud(id, estado, respuestaTexto[id] || null);
      const accion = estado === 'aprobada' ? 'aprobada (salida registrada automáticamente)' : 'rechazada';
      mostrarToast('success', `Solicitud ${accion}`);
      setRespuestaTexto((prev) => { const next = { ...prev }; delete next[id]; return next; });
      cargarSolicitudes();
    } catch (err) { mostrarToast('error', err.response?.data?.mensaje || err.message || 'Error al procesar'); }
    finally { setGuardando(null); }
  };

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const procesadas = solicitudes.filter((s) => s.estado !== 'pendiente');

  // true solo cuando conocemos el stock y no alcanza; si es desconocido (null/undefined) no bloquea (lo valida el backend).
  const stockInsuficiente = (sol) => {
    if (!sol.nombre_item) return false;
    const stock = stockMap[`${sol.nombre_item}|${sol.tipo}`];
    return stock != null && stock < (sol.cantidad || 1);
  };
  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="page-header">
          <div className="page-header-content">
            <MdOutlineAssignment className="page-header-icon" />
            <h1 className="page-header-title">Solicitudes de Herramientas</h1>
            {esCoordinador && (
              <div className="flex items-center gap-1.5">
                <label className="text-white/60 text-xs font-medium whitespace-nowrap">Emergencia</label>
                <select
                  className="page-select"
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

        {toast && <Toast type={toast.tipo} message={toast.texto} />}

        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">
          {pendientes.length > 0 && (
            <div className="bg-amber-50 border-l-4 border-[#835100] rounded-xl p-4 flex items-start gap-3">
              <MdWarning className="text-[#835100] text-xl flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#835100] text-sm">
                  {puedeAprobar
                    ? `${pendientes.length} solicitud${pendientes.length > 1 ? 'es' : ''} pendiente${pendientes.length > 1 ? 's' : ''} de respuesta`
                    : `${pendientes.length} solicitud${pendientes.length > 1 ? 'es' : ''} en espera de aprobación`}
                </p>
                <p className="text-[#835100] text-xs mt-0.5">
                  {puedeAprobar ? 'Revisalas abajo — al aprobar, la salida del inventario se registra automáticamente.' : 'Tu jefe o el coordinador las revisará pronto.'}
                </p>
              </div>
            </div>
          )}

          {pendientes.length > 0 && (
            <div className="card overflow-hidden">
              <div className="section-header px-4 py-3 border-b border-outline-variant/60 mb-0">
                <span className="section-number">!</span>
                <h2 className="section-title">Pendientes</h2>
                <span className="ml-auto text-xs text-outline">{pendientes.length}</span>
              </div>

              <div className="divide-y divide-outline-variant/60">
                {pendientes.map((sol) => {
                  const tipoOpt = TIPO_OPTS.find((o) => o.value === sol.tipo);
                  return (
                    <div key={sol.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge color={sol.estado === 'pendiente' ? 'warning' : sol.estado === 'aprobada' ? 'success' : 'error'}>{sol.estado}</Badge>
                          {tipoOpt && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant capitalize">
                              {tipoOpt.icon} {sol.tipo}
                            </span>
                          )}
                          {sol.nombre_item ? <span className="text-sm font-bold text-primary">"{sol.nombre_item}"</span> : <span className="text-xs text-outline italic">(sin ítem especificado)</span>}
                          {(sol.cantidad ?? 1) > 1 && <span className="text-xs text-on-surface-variant font-medium">× {sol.cantidad}</span>}
                        </div>
                        <span className="flex items-center gap-1 text-[10px] text-outline flex-shrink-0">
                          <MdSchedule className="text-xs" /> {formatFecha(sol.fecha_creacion)}
                        </span>
                      </div>

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
                            <span className="font-semibold text-primary">{sol.cuadrilla?.nombre ?? `Cuadrilla #${sol.cuadrilla_id}`}</span>
                            {sol.emergencia?.nombre && <span className="text-outline"> · {sol.emergencia.nombre}</span>}
                          </span>
                        </div>
                        {puedeAprobar && (sol.solicitante?.nombre || sol.jefe?.nombre) && (
                          <div className="flex gap-2">
                            <span className="text-[10px] font-semibold text-outline uppercase w-16 flex-shrink-0 pt-0.5">De</span>
                            <span className="text-xs text-on-surface">{sol.solicitante?.nombre || sol.jefe?.nombre}</span>
                          </div>
                        )}
                      </div>

                      {puedeAprobar && (
                        <div className="flex flex-col gap-2">
                          {sol.nombre_item && (() => {
                            const clave = `${sol.nombre_item}|${sol.tipo}`;
                            const stock = stockMap[clave];
                            const necesita = sol.cantidad || 1;
                            if (stock === undefined) return null;
                            const color = stock === null
                              ? 'bg-surface-container text-on-surface-variant'
                              : stock >= necesita
                                ? 'bg-green-50 border-[#006D37]/30 text-[#006D37]'
                                : stock > 0
                                  ? 'bg-amber-50 border-[#835100]/30 text-[#835100]'
                                  : 'bg-red-50 border-error/30 text-error';
                            return (
                              <div className={`flex items-center justify-between rounded-xl px-3 py-2 border text-xs ${color}`}>
                                <span className="font-semibold">Stock disponible en almacén</span>
                                <span className="font-bold text-sm">{stock === null ? '—' : `${stock} ud.`}</span>
                                {stock !== null && stock < necesita && (
                                  <span className="text-[10px] font-medium ml-2">⚠ pide {necesita}, hay {stock}</span>
                                )}
                              </div>
                            );
                          })()}
                          <textarea
                            className="input-field resize-none"
                            rows={2}
                            placeholder="Respuesta opcional (ej: se enviarán mañana, stock insuficiente…)"
                            value={respuestaTexto[sol.id] || ''}
                            onChange={(e) => setRespuestaTexto((prev) => ({ ...prev, [sol.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="success"
                              disabled={guardando === sol.id || stockInsuficiente(sol)}
                              onClick={() => handleResolver(sol.id, 'aprobada')}
                              className="flex-1"
                            >
                              <MdCheckCircle /> {stockInsuficiente(sol) ? 'Sin stock' : `Aprobar${sol.nombre_item ? ' y registrar salida' : ''}`}
                            </Button>
                            <Button
                              variant="error"
                              disabled={guardando === sol.id}
                              onClick={() => handleResolver(sol.id, 'rechazada')}
                              className="flex-1"
                            >
                              <MdCancel /> Rechazar
                            </Button>
                          </div>
                          {stockInsuficiente(sol) ? (
                            <p className="text-[10px] text-error font-semibold">
                              ✕ Sin stock suficiente en el almacén — no se puede aprobar. Registra más stock o rechaza la solicitud.
                            </p>
                          ) : sol.nombre_item && (
                            <p className="text-[10px] text-[#006D37] font-medium">
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

          {procesadas.length > 0 && (
            <div className="card overflow-hidden">
              <div className="section-header px-4 py-3 border-b border-outline-variant/60 mb-0">
                <span className="section-number">✓</span>
                <h2 className="section-title">Historial</h2>
                <span className="ml-auto text-xs text-outline">{procesadas.length}</span>
              </div>

              <div className="divide-y divide-outline-variant/60">
                {procesadas.map((sol) => {
                  const tipoOpt = TIPO_OPTS.find((o) => o.value === sol.tipo);
                  return (
                    <div key={sol.id} className="px-4 py-3 flex flex-wrap items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge color={sol.estado === 'aprobada' ? 'success' : 'error'}>{sol.estado}</Badge>
                          {tipoOpt && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-surface-container text-on-surface-variant capitalize">
                              {tipoOpt.icon} {sol.tipo}
                            </span>
                          )}
                          {sol.nombre_item ? <span className="text-xs text-on-surface-variant">"{sol.nombre_item}" ×{sol.cantidad || 1}</span> : <span className="text-xs text-outline italic">(sin ítem especificado)</span>}
                        </div>
                        {sol.descripcion && <p className="text-xs text-on-surface-variant mt-1">{sol.descripcion}</p>}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          <span className="text-[10px] font-semibold text-primary">{sol.cuadrilla?.nombre ?? `Cuadrilla #${sol.cuadrilla_id}`}</span>
                          {sol.emergencia?.nombre && <span className="text-[10px] text-outline">{sol.emergencia.nombre}</span>}
                          {puedeAprobar && (sol.solicitante?.nombre || sol.jefe?.nombre) && <span className="text-[10px] text-outline">Por: {sol.solicitante?.nombre || sol.jefe?.nombre}</span>}
                        </div>
                        {sol.respuesta && <p className="text-xs text-on-surface-variant italic mt-0.5">Resp.: {sol.respuesta}</p>}
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
              <p className="text-sm font-medium text-on-surface-variant">No hay solicitudes{puedeAprobar ? '' : ' tuyas'} registradas</p>
            </div>
          )}
        </div>
      </div>

      {/* FAB: nueva solicitud */}
      {(esVoluntario || esJefe || esCoordinador) && !mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="fixed bottom-6 right-6 z-[400] flex items-center gap-2.5 px-5 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm active:scale-95"
        >
          <MdAdd className="text-xl" /> Nueva solicitud
        </button>
      )}

      {/* Modal nueva solicitud */}
      <Modal
        open={mostrarForm}
        onClose={() => setMostrarForm(false)}
        title="Nueva solicitud"
        subtitle={esCoordinador ? 'Solicitud en nombre de una cuadrilla — se registrará con tu usuario' : esVoluntario ? 'Tu jefe o el coordinador recibirá el pedido y lo aprobará o rechazará' : 'El coordinador o tú pueden aprobar los pedidos de tu cuadrilla'}
        icon={<MdOutlineAssignment className="text-primary text-xl" />}
      >
        <form onSubmit={handleCrear} className="flex flex-col gap-4">
          <div>
            <label className="label">① Tipo de ítem</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPO_OPTS.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition ${
                    form.tipo === t.value ? 'border-primary bg-primary-50 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  <input type="radio" className="sr-only" checked={form.tipo === t.value} onChange={() => setForm({ ...form, tipo: t.value })} />
                  {t.icon} {t.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">② ¿Qué necesitas?</label>
            <div className="flex gap-2">
              <select
                required
                className="input-field flex-1"
                value={form.nombre_item}
                onChange={(e) => setForm({ ...form, nombre_item: e.target.value })}
              >
                <option value="">— Selecciona del inventario —</option>
                {catalogo.filter((c) => c.tipo_item === form.tipo).map((c) => {
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
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                title="Cantidad"
              />
            </div>
            <p className="text-xs text-outline mt-1">Ítem desde el inventario · Cantidad requerida</p>
          </div>

          {!esVoluntario && emergencias.length > 1 && (
            <div>
              <label className="label">③ Emergencia</label>
              <select className="input-field" value={form.emergenciaId} onChange={(e) => setForm({ ...form, emergenciaId: e.target.value })}>
                {emergencias.map((em) => (<option key={em.id} value={em.id}>{em.nombre}</option>))}
              </select>
            </div>
          )}

          {(esCoordinador ? cuadrillas.length > 0 : cuadrillas.length > 1) && (
            <div>
              <label className="label">Cuadrilla</label>
              <select className="input-field" value={form.cuadrillaId} onChange={(e) => setForm({ ...form, cuadrillaId: e.target.value })}>
                {cuadrillas.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Motivo / detalles</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="¿Para qué se necesita? Ej: reemplazo de herramienta dañada…"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={enviando}>
            <MdSend /> {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
