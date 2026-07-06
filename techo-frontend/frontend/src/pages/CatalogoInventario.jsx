import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  MdInventory,
  MdBuild,
  MdClose,
  MdRefresh,
  MdInfo,
  MdAdd,
  MdSend,
  MdCheckCircle,
  MdError,
  MdExpandMore,
  MdExpandLess,
  MdGroup,
} from 'react-icons/md';
import { FaWrench, FaHardHat, FaBoxes } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerCatalogoInventario } from '../services/herramientaService';
import { listarMovimientos, registrarStock } from '../services/movimientoService';
import { listarTodasLasCuadrillasConEstado } from '../services/cuadrillaService';

const TIPO_ITEM_OPTS = [
  { value: 'herramienta', label: 'Herramienta', icon: <FaWrench className="text-xs" /> },
  { value: 'epp',         label: 'EPP',         icon: <FaHardHat className="text-xs" /> },
  { value: 'material',    label: 'Material',    icon: <FaBoxes className="text-xs" /> },
  { value: 'otro',        label: 'Otro',        icon: <MdInventory className="text-xs" /> },
];

const TIPO_COLORS = {
  herramienta: 'bg-primary/10 text-primary',
  epp:         'bg-tertiary/10 text-tertiary',
  material:    'bg-tertiary/10 text-tertiary',
  otro:        'bg-surface-container text-on-surface',
};

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—';

const formVacioItem = { tipo: 'herramienta', nombre_item: '', cantidad: 1, observaciones: '' };

export default function CatalogoInventario() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';

  const [catalogo,         setCatalogo]         = useState(null);
  const [cargandoCat,      setCargandoCat]       = useState(true);
  const [movimientos,      setMovimientos]       = useState([]);
  const [cuadrillaMap,     setCuadrillaMap]      = useState({});
  const [filtroCatTipo,    setFiltroCatTipo]     = useState('');
  const [busquedaCat,      setBusquedaCat]       = useState('');
  const [expandidos,       setExpandidos]        = useState(new Set());
  const [mostrarFormItem,  setMostrarFormItem]   = useState(false);
  const [formItem,         setFormItem]          = useState(formVacioItem);
  const [enviandoItem,     setEnviandoItem]      = useState(false);
  const [toast,            setToast]             = useState(null);

  const mostrarToast = (tipo, texto) => {
    setToast({ tipo, texto });
    setTimeout(() => setToast(null), 4000);
  };

  const cargarCatalogo = useCallback(async () => {
    setCargandoCat(true);
    try {
      const res = await obtenerCatalogoInventario();
      setCatalogo(res.datos || null);
    } catch {
      /* fallo silencioso */
    } finally {
      setCargandoCat(false);
    }
  }, []);

  // Carga inicial: catálogo + todos los movimientos + todas las cuadrillas
  useEffect(() => {
    cargarCatalogo();

    listarMovimientos()
      .then((res) => setMovimientos(res.datos?.movimientos || []))
      .catch(() => setMovimientos([]));

    listarTodasLasCuadrillasConEstado()
      .then((res) => {
        const lista = res.datos?.cuadrillas || [];
        const mapa = lista.reduce((acc, c) => { acc[c.id] = c.nombre; return acc; }, {});
        setCuadrillaMap(mapa);
      })
      .catch(() => {});
  }, [cargarCatalogo]);

  const handleRefresh = () => {
    cargarCatalogo();
    listarMovimientos()
      .then((res) => setMovimientos(res.datos?.movimientos || []))
      .catch(() => {});
  };

  // Salidas activas del almacén agrupadas por nombre_item (en minúscula)
  const prestamosPorNombre = movimientos
    .filter((m) => m.tipo_movimiento === 'salida' && m.estado === 'activo')
    .reduce((acc, m) => {
      const key = m.nombre_item?.toLowerCase();
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        id:             m.id,
        cuadrillaNombre: cuadrillaMap[m.cuadrilla_id] || m.persona_recibe || `Cuadrilla #${m.cuadrilla_id}`,
        personaRecibe:  m.persona_recibe,
        cantidad:       Number(m.cantidad) || 1,
        fechaSalida:    m.fecha_salida,
      });
      return acc;
    }, {});

  const catalogoFiltrado = (catalogo?.catalogo || []).filter((item) => {
    if (filtroCatTipo && item.tipo_item !== filtroCatTipo) return false;
    if (busquedaCat && !item.nombre.toLowerCase().includes(busquedaCat.toLowerCase())) return false;
    return true;
  });

  const toggleExpandir = (clave) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.has(clave) ? next.delete(clave) : next.add(clave);
      return next;
    });

  const handleAgregarItem = async (e) => {
    e.preventDefault();
    if (!formItem.nombre_item.trim()) return mostrarToast('error', 'Ingresa el nombre del ítem');
    if (!formItem.cantidad || Number(formItem.cantidad) < 1)
      return mostrarToast('error', 'La cantidad debe ser al menos 1');
    setEnviandoItem(true);
    try {
      await registrarStock({
        nombre_item:   formItem.nombre_item.trim(),
        cantidad:      Number(formItem.cantidad),
        tipo_item:     formItem.tipo,
        observaciones: formItem.observaciones.trim() || null,
      });
      mostrarToast('exito', `"${formItem.nombre_item}" (×${formItem.cantidad}) agregado al inventario`);
      setFormItem(formVacioItem);
      setMostrarFormItem(false);
      cargarCatalogo();
    } catch (err) {
      mostrarToast('error', err.response?.data?.mensaje || err.message || 'Error al agregar ítem');
    } finally {
      setEnviandoItem(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-[76px] left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-xl text-sm font-semibold ${
          toast.tipo === 'exito' ? 'bg-secondary text-white' : 'bg-error-container/400 text-white'
        }`}>
          {toast.tipo === 'exito' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
          {toast.texto}
        </div>
      )}

      <div className="pt-[60px]">
        {/* Header */}
        <div className="bg-primary shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
            <MdInventory className="text-white/80 text-2xl flex-shrink-0" />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Inventario</h1>
              <p className="text-white/50 text-xs">Todos los ítems de la empresa</p>
            </div>
            <button
              onClick={handleRefresh}
              className="ml-auto p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Actualizar"
            >
              <MdRefresh className={cargandoCat ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">

          {/* Tarjetas resumen por tipo */}
          {catalogo?.porTipo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { tipo: 'herramienta', label: 'Herramientas', icon: <FaWrench />,    color: 'border-primary/30 bg-primary/5 text-primary',      barColor: 'bg-primary/50' },
                { tipo: 'epp',         label: 'EPP',          icon: <FaHardHat />,   color: 'border-tertiary/30 bg-tertiary/5 text-tertiary', barColor: 'bg-tertiary/50' },
                { tipo: 'material',    label: 'Materiales',   icon: <FaBoxes />,     color: 'border-tertiary/30 bg-tertiary/5 text-tertiary', barColor: 'bg-tertiary-container' },
                { tipo: 'otro',        label: 'Otros',        icon: <MdInventory />, color: 'border-outline-variant bg-surface-container-low text-on-surface-variant',       barColor: 'bg-outline' },
              ].map(({ tipo, label, icon, color, barColor }) => {
                const datos = catalogo.porTipo[tipo] || { total: 0, buenas: 0, danadas: 0 };
                const prestamosDelTipo = Object.entries(prestamosPorNombre)
                  .filter(([k]) => (catalogo.catalogo || []).some((c) => c.nombre.toLowerCase() === k && c.tipo_item === tipo))
                  .reduce((s, [, arr]) => s + arr.reduce((ss, p) => ss + p.cantidad, 0), 0);
                const pctSano = datos.total > 0 ? Math.round((datos.buenas / datos.total) * 100) : 0;
                return (
                  <button
                    key={tipo}
                    onClick={() => setFiltroCatTipo(filtroCatTipo === tipo ? '' : tipo)}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                      filtroCatTipo === tipo
                        ? color + ' shadow-md scale-[1.02]'
                        : 'border-outline-variant/60 bg-white shadow-sm hover:shadow-md hover:border-outline-variant'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 font-bold text-xs ${filtroCatTipo === tipo ? '' : 'text-on-surface-variant'}`}>
                      {icon} {label}
                    </div>
                    <span className={`text-2xl font-black tabular-nums ${filtroCatTipo === tipo ? '' : 'text-on-surface'}`}>
                      {datos.total}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 bg-secondary/10 text-secondary rounded-full font-semibold">{datos.buenas} buenas</span>
                      {datos.danadas > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-tertiary/10 text-tertiary rounded-full font-semibold">{datos.danadas} dañ.</span>}
                      {prestamosDelTipo > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-error-container text-on-error-container rounded-full font-semibold">{prestamosDelTipo} en préstamo</span>}
                    </div>
                    {datos.total > 0 && (
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden bg-black/[0.07]">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pctSano}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tabla principal */}
          <div className="bg-white rounded-xl border border-outline-variant/60 overflow-hidden shadow-sm">
            {/* Barra de filtros */}
            <div className="px-4 py-3 border-b border-outline-variant/60 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <MdBuild className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-sm" />
                <input
                  type="text"
                  placeholder="Buscar ítem por nombre..."
                  value={busquedaCat}
                  onChange={(e) => setBusquedaCat(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {busquedaCat && (
                  <button onClick={() => setBusquedaCat('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant">
                    <MdClose className="text-sm" />
                  </button>
                )}
              </div>
              {filtroCatTipo && (
                <button
                  onClick={() => setFiltroCatTipo('')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition"
                >
                  <MdClose className="text-xs" />
                  Filtro: {TIPO_ITEM_OPTS.find((t) => t.value === filtroCatTipo)?.label}
                </button>
              )}
              <span className="ml-auto text-xs text-outline">
                {catalogoFiltrado.length} ítem{catalogoFiltrado.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Tabla */}
            {cargandoCat ? (
              <div className="flex items-center justify-center py-10 gap-2 text-outline">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando inventario...</span>
              </div>
            ) : catalogoFiltrado.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-outline">
                <MdInfo className="text-4xl mb-2 opacity-20" />
                <p className="text-sm text-on-surface-variant">
                  {(catalogo?.catalogo || []).length === 0
                    ? 'Aún no hay ítems registrados — agrega uno con el botón +'
                    : 'Sin coincidencias para ese filtro o búsqueda'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/60 bg-surface-container-low">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Ítem</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Total</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-secondary uppercase">Buenas</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-tertiary uppercase">Entregadas</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-tertiary uppercase">Dañadas</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-error uppercase">En préstamo</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-secondary uppercase">Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogoFiltrado.map((item) => {
                      const prestamos  = prestamosPorNombre[item.nombre.toLowerCase()] || [];
                      const totalPrest = prestamos.reduce((s, p) => s + p.cantidad, 0);
                      const disp       = Math.max(0, item.buenas - totalPrest);
                      const hayProb    = item.danadas > 0 || item.perdidas > 0 || item.no_devueltas > 0;
                      const clave      = `${item.nombre}:${item.tipo_item}`;
                      const expandido  = expandidos.has(clave);

                      return (
                        <Fragment key={clave}>
                          <tr
                            className={`border-b border-outline-variant/60 hover:bg-surface-container-low transition ${hayProb ? 'bg-tertiary/5/30' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TIPO_COLORS[item.tipo_item] || TIPO_COLORS.otro}`}>
                                  {TIPO_ITEM_OPTS.find((t) => t.value === item.tipo_item)?.label || item.tipo_item}
                                </span>
                                <span className="font-medium text-on-surface">{item.nombre}</span>
                              </div>
                            </td>
                            <td className="text-center px-3 py-3 font-bold tabular-nums text-primary">{item.total}</td>
                            <td className="text-center px-3 py-3 text-secondary font-semibold tabular-nums">{item.buenas}</td>
                            <td className="text-center px-3 py-3 text-tertiary font-semibold tabular-nums">{item.entregadas}</td>
                            <td className="text-center px-3 py-3 text-tertiary font-semibold tabular-nums">{item.danadas}</td>
                            <td className="text-center px-3 py-3">
                              {totalPrest > 0 ? (
                                <button
                                  onClick={() => toggleExpandir(clave)}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-error-container hover:bg-error-container text-on-error-container rounded-full text-xs font-bold transition"
                                >
                                  {totalPrest}
                                  {expandido ? <MdExpandLess className="text-sm" /> : <MdExpandMore className="text-sm" />}
                                </button>
                              ) : (
                                <span className="text-outline-variant text-xs">—</span>
                              )}
                            </td>
                            <td className="text-center px-3 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                disp === 0 ? 'bg-error-container text-on-error-container' : 'bg-secondary/10 text-secondary'
                              }`}>
                                {disp}
                              </span>
                            </td>
                          </tr>

                          {/* Fila expandible: cuadrillas con préstamos de este ítem */}
                          {expandido && prestamos.length > 0 && (
                            <tr className="bg-error-container/40/60 border-b border-error/20">
                              <td colSpan={7} className="px-6 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <MdGroup className="text-error text-base" />
                                  <span className="text-xs font-bold text-error uppercase tracking-wide">
                                    En préstamo — {totalPrest} unidad{totalPrest !== 1 ? 'es' : ''} fuera
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {prestamos.map((p) => (
                                    <div key={p.id} className="flex items-center gap-2 bg-white border border-error/30 rounded-xl px-3 py-2 text-xs shadow-sm">
                                      <MdGroup className="text-error-container flex-shrink-0" />
                                      <div>
                                        <p className="font-bold text-on-surface">{p.cuadrillaNombre}</p>
                                        {p.personaRecibe && p.personaRecibe !== p.cuadrillaNombre && (
                                          <p className="text-on-surface-variant">Recibió: {p.personaRecibe}</p>
                                        )}
                                        <p className="text-outline">
                                          {p.cantidad} ud. · salida {formatFecha(p.fechaSalida)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>

                  {catalogoFiltrado.length > 1 && (
                    <tfoot>
                      <tr className="bg-primary/5 border-t-2 border-primary/20">
                        <td className="px-4 py-2.5 text-xs font-bold text-primary uppercase">Total filtrado</td>
                        <td className="text-center px-3 py-2.5 font-bold text-primary">
                          {catalogoFiltrado.reduce((s, i) => s + i.total, 0)}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-secondary">
                          {catalogoFiltrado.reduce((s, i) => s + i.buenas, 0)}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-tertiary">
                          {catalogoFiltrado.reduce((s, i) => s + i.entregadas, 0)}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-tertiary">
                          {catalogoFiltrado.reduce((s, i) => s + i.danadas, 0)}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-error">
                          {catalogoFiltrado.reduce((s, i) => s + (prestamosPorNombre[i.nombre.toLowerCase()] || []).reduce((ss, p) => ss + p.cantidad, 0), 0)}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-secondary">
                          {catalogoFiltrado.reduce((s, i) => {
                            const prest = (prestamosPorNombre[i.nombre.toLowerCase()] || []).reduce((ss, p) => ss + p.cantidad, 0);
                            return s + Math.max(0, i.buenas - prest);
                          }, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB: agregar ítem (solo coordinador) */}
      {esCoordinador && !mostrarFormItem && (
        <button
          onClick={() => setMostrarFormItem(true)}
          className="fixed bottom-6 right-6 z-[400] flex items-center gap-2.5 px-5 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm active:scale-95"
        >
          <MdAdd className="text-xl" /> Agregar ítem
        </button>
      )}

      {/* Modal: nuevo ítem */}
      {mostrarFormItem && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <MdInventory className="text-primary text-xl" />
                <div>
                  <h2 className="font-bold text-on-surface text-sm">Agregar ítem al inventario</h2>
                  <p className="text-xs text-outline mt-0.5">Registra una entrada de stock en el almacén</p>
                </div>
              </div>
              <button onClick={() => setMostrarFormItem(false)} className="text-outline hover:text-on-surface-variant ml-2 flex-shrink-0">
                <MdClose className="text-xl" />
              </button>
            </div>

            <form onSubmit={handleAgregarItem} className="p-5 flex flex-col gap-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">Tipo de ítem</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPO_ITEM_OPTS.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition ${
                        formItem.tipo === t.value
                          ? 'border-primary bg-primary-fixed/40 text-primary'
                          : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                      }`}
                    >
                      <input type="radio" className="sr-only" checked={formItem.tipo === t.value}
                        onChange={() => setFormItem({ ...formItem, tipo: t.value })} />
                      {t.icon} {t.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Nombre del ítem</label>
                <input
                  required
                  type="text"
                  className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Martillo, Casco EPP, Tornillo 3/8…"
                  value={formItem.nombre_item}
                  onChange={(e) => setFormItem({ ...formItem, nombre_item: e.target.value })}
                />
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">Cantidad</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={9999}
                  className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formItem.cantidad}
                  onChange={(e) => setFormItem({ ...formItem, cantidad: e.target.value })}
                />
                <p className="text-[10px] text-outline mt-1">
                  Stock que se agrega al almacén. Mínimo 1.
                </p>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Observaciones <span className="text-outline font-normal">(opcional)</span>
                </label>
                <textarea
                  className="w-full border border-outline-variant rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Ej: donación, compra de emergencia, proveedor…"
                  value={formItem.observaciones}
                  onChange={(e) => setFormItem({ ...formItem, observaciones: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={enviandoItem}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <MdSend /> {enviandoItem ? 'Registrando…' : 'Agregar al inventario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
