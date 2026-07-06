import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  MdInventory, MdBuild, MdClose, MdRefresh, MdInfo, MdAdd,
  MdSend, MdCheckCircle, MdError, MdExpandMore, MdExpandLess, MdGroup,
} from 'react-icons/md';
import { FaWrench, FaHardHat, FaBoxes } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerCatalogoInventario } from '../services/herramientaService';
import { listarMovimientos, registrarStock } from '../services/movimientoService';
import { listarTodasLasCuadrillasConEstado } from '../services/cuadrillaService';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import Input from '../components/ui/Input';

const TIPO_ITEM_OPTS = [
  { value: 'herramienta', label: 'Herramienta', icon: <FaWrench className="text-xs" /> },
  { value: 'epp', label: 'EPP', icon: <FaHardHat className="text-xs" /> },
  { value: 'material', label: 'Material', icon: <FaBoxes className="text-xs" /> },
  { value: 'otro', label: 'Otro', icon: <MdInventory className="text-xs" /> },
];

const TIPO_COLORS = {
  herramienta: 'badge-blue',
  epp: 'badge-yellow',
  material: 'badge-yellow',
  otro: 'badge-gray',
};

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—';

const formVacioItem = { tipo: 'herramienta', nombre_item: '', cantidad: 1, observaciones: '' };

export default function CatalogoInventario() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';

  const [catalogo, setCatalogo] = useState(null);
  const [cargandoCat, setCargandoCat] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [cuadrillaMap, setCuadrillaMap] = useState({});
  const [filtroCatTipo, setFiltroCatTipo] = useState('');
  const [busquedaCat, setBusquedaCat] = useState('');
  const [expandidos, setExpandidos] = useState(new Set());
  const [mostrarFormItem, setMostrarFormItem] = useState(false);
  const [formItem, setFormItem] = useState(formVacioItem);
  const [enviandoItem, setEnviandoItem] = useState(false);
  const [toast, setToast] = useState(null);

  const mostrarToast = (tipo, texto) => { setToast({ tipo, texto }); setTimeout(() => setToast(null), 4000); };

  const cargarCatalogo = useCallback(async () => {
    setCargandoCat(true);
    try { const res = await obtenerCatalogoInventario(); setCatalogo(res.datos || null); }
    catch { /* fallo silencioso */ }
    finally { setCargandoCat(false); }
  }, []);

  useEffect(() => {
    const cargarTodo = () => {
      cargarCatalogo();
      listarMovimientos().then((res) => setMovimientos(res.datos?.movimientos || [])).catch(() => setMovimientos([]));
      listarTodasLasCuadrillasConEstado().then((res) => {
        const lista = res.datos?.cuadrillas || [];
        const mapa = lista.reduce((acc, c) => { acc[c.id] = c.nombre; return acc; }, {});
        setCuadrillaMap(mapa);
      }).catch(() => {});
    };
    cargarTodo();
    const intervalo = setInterval(cargarTodo, 30000);
    return () => clearInterval(intervalo);
  }, [cargarCatalogo]);

  const handleRefresh = () => {
    cargarCatalogo();
    listarMovimientos().then((res) => setMovimientos(res.datos?.movimientos || [])).catch(() => {});
  };

  const prestamosPorNombre = movimientos
    .filter((m) => m.tipo_movimiento === 'salida' && m.estado === 'activo')
    .reduce((acc, m) => {
      const key = m.nombre_item?.toLowerCase();
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        id: m.id, cuadrillaNombre: cuadrillaMap[m.cuadrilla_id] || m.persona_recibe || `Cuadrilla #${m.cuadrilla_id}`,
        personaRecibe: m.persona_recibe, cantidad: Number(m.cantidad) || 1, fechaSalida: m.fecha_salida,
      });
      return acc;
    }, {});

  const catalogoFiltrado = (catalogo?.catalogo || []).filter((item) => {
    if (filtroCatTipo && item.tipo_item !== filtroCatTipo) return false;
    if (busquedaCat && !item.nombre.toLowerCase().includes(busquedaCat.toLowerCase())) return false;
    return true;
  });

  const toggleExpandir = (clave) =>
    setExpandidos((prev) => { const next = new Set(prev); next.has(clave) ? next.delete(clave) : next.add(clave); return next; });

  const handleAgregarItem = async (e) => {
    e.preventDefault();
    if (!formItem.nombre_item.trim()) return mostrarToast('error', 'Ingresa el nombre del ítem');
    if (!formItem.cantidad || Number(formItem.cantidad) < 1) return mostrarToast('error', 'La cantidad debe ser al menos 1');
    setEnviandoItem(true);
    try {
      await registrarStock({
        nombre_item: formItem.nombre_item.trim(), cantidad: Number(formItem.cantidad),
        tipo_item: formItem.tipo, observaciones: formItem.observaciones.trim() || null,
      });
      mostrarToast('success', `"${formItem.nombre_item}" (×${formItem.cantidad}) agregado al inventario`);
      setFormItem(formVacioItem);
      setMostrarFormItem(false);
      cargarCatalogo();
    } catch (err) { mostrarToast('error', err.response?.data?.mensaje || err.message || 'Error al agregar ítem'); }
    finally { setEnviandoItem(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-14">
        <div className="page-header">
          <div className="page-header-content">
            <MdInventory className="page-header-icon" />
            <div>
              <h1 className="page-header-title">Inventario</h1>
              <p className="text-white/50 text-xs">Todos los ítems de la empresa</p>
            </div>
            {esCoordinador && (
              <button
                onClick={() => setMostrarFormItem(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition"
              >
                <MdAdd className="text-sm" /> Agregar ítem
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Actualizar"
            >
              <MdRefresh className={cargandoCat ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {toast && <Toast type={toast.tipo} message={toast.texto} />}

        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">
          {catalogo?.porTipo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { tipo: 'herramienta', label: 'Herramientas', icon: <FaWrench />, barColor: 'bg-primary' },
                { tipo: 'epp', label: 'EPP', icon: <FaHardHat />, barColor: 'bg-[#835100]' },
                { tipo: 'material', label: 'Materiales', icon: <FaBoxes />, barColor: 'bg-[#835100]' },
                { tipo: 'otro', label: 'Otros', icon: <MdInventory />, barColor: 'bg-outline' },
              ].map(({ tipo, label, icon, barColor }) => {
                const datos = catalogo.porTipo[tipo] || { total: 0, buenas: 0, danadas: 0, disponible: 0, stock_almacen: 0 };
                const prestamosDelTipo = Object.entries(prestamosPorNombre)
                  .filter(([k]) => (catalogo.catalogo || []).some((c) => c.nombre.toLowerCase() === k && c.tipo_item === tipo))
                  .reduce((s, [, arr]) => s + arr.reduce((ss, p) => ss + p.cantidad, 0), 0);
                const pctSano = datos.total > 0 ? Math.round((datos.buenas / datos.total) * 100) : 0;
                return (
                  <button
                    key={tipo}
                    onClick={() => setFiltroCatTipo(filtroCatTipo === tipo ? '' : tipo)}
                    className={`stat-card border-t-[3px] text-left ${filtroCatTipo === tipo ? 'border-primary bg-primary-50' : 'border-t-transparent'}`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-on-surface-variant">
                      {icon} {label}
                    </div>
                    <span className={`text-2xl font-black tabular-nums ${filtroCatTipo === tipo ? 'text-primary' : 'text-on-surface'}`}>
                      {datos.total}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      <Badge color="success">{datos.disponible ?? 0} disp.</Badge>
                      {(datos.stock_almacen ?? 0) > 0 && <Badge color="blue">{datos.stock_almacen} en almacén</Badge>}
                      {datos.danadas > 0 && <Badge color="warning">{datos.danadas} dañ.</Badge>}
                      {prestamosDelTipo > 0 && <Badge color="red">{prestamosDelTipo} en préstamo</Badge>}
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

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant/60 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <MdBuild className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-sm" />
                <input
                  type="text"
                  placeholder="Buscar ítem por nombre..."
                  value={busquedaCat}
                  onChange={(e) => setBusquedaCat(e.target.value)}
                  className="input-field pl-8"
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
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-50 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition"
                >
                  <MdClose className="text-xs" />
                  Filtro: {TIPO_ITEM_OPTS.find((t) => t.value === filtroCatTipo)?.label}
                </button>
              )}
              <span className="ml-auto text-xs text-outline">{catalogoFiltrado.length} ítem{catalogoFiltrado.length !== 1 ? 's' : ''}</span>
            </div>

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
                      <th className="table-header">Ítem</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-on-surface-variant uppercase">Total</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#006D37] uppercase">Buenas</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#835100] uppercase">Entregadas</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#835100] uppercase">Dañadas</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-primary uppercase">En almacén</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-error uppercase">En préstamo</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-[#006D37] uppercase">Disponibles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogoFiltrado.map((item) => {
                      const prestamos = prestamosPorNombre[item.nombre.toLowerCase()] || [];
                      const totalPrest = prestamos.reduce((s, p) => s + p.cantidad, 0);
                      // Disponible real del almacén (stock ingresado − préstamos activos), calculado en el backend.
                      const disp = item.disponible ?? Math.max(0, item.buenas - totalPrest);
                      const hayProb = item.danadas > 0 || item.perdidas > 0 || item.no_devueltas > 0;
                      const clave = `${item.nombre}:${item.tipo_item}`;
                      const expandido = expandidos.has(clave);

                      return (
                        <Fragment key={clave}>
                          <tr className={`table-row ${hayProb ? 'bg-amber-50/50' : ''}`}>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <Badge color={item.tipo_item === 'herramienta' ? 'blue' : item.tipo_item === 'epp' || item.tipo_item === 'material' ? 'warning' : 'gray'}>
                                  {TIPO_ITEM_OPTS.find((t) => t.value === item.tipo_item)?.label || item.tipo_item}
                                </Badge>
                                <span className="font-medium text-on-surface">{item.nombre}</span>
                              </div>
                            </td>
                            <td className="text-center px-3 py-3 font-bold tabular-nums text-primary">{item.total}</td>
                            <td className="text-center px-3 py-3 text-[#006D37] font-semibold tabular-nums">{item.buenas}</td>
                            <td className="text-center px-3 py-3 text-[#835100] font-semibold tabular-nums">{item.entregadas}</td>
                            <td className="text-center px-3 py-3 text-[#835100] font-semibold tabular-nums">{item.danadas}</td>
                            <td className="text-center px-3 py-3 font-semibold tabular-nums text-primary">{item.stock_almacen ?? 0}</td>
                            <td className="text-center px-3 py-3">
                              {totalPrest > 0 ? (
                                <button
                                  onClick={() => toggleExpandir(clave)}
                                  className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-red-50 hover:bg-red-100 text-error rounded-full text-xs font-bold transition"
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
                                disp === 0 ? 'badge-red' : 'badge-green'
                              }`}>{disp}</span>
                            </td>
                          </tr>

                          {expandido && prestamos.length > 0 && (
                            <tr className="bg-red-50/60 border-b border-error/20">
                              <td colSpan={8} className="px-6 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <MdGroup className="text-error text-base" />
                                  <span className="text-xs font-bold text-error uppercase tracking-wide">
                                    En préstamo — {totalPrest} unidad{totalPrest !== 1 ? 'es' : ''} fuera
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {prestamos.map((p) => (
                                    <div key={p.id} className="flex items-center gap-2 bg-white border border-error/30 rounded-xl px-3 py-2 text-xs shadow-sm">
                                      <MdGroup className="text-error flex-shrink-0" />
                                      <div>
                                        <p className="font-bold text-on-surface">{p.cuadrillaNombre}</p>
                                        {p.personaRecibe && p.personaRecibe !== p.cuadrillaNombre && (
                                          <p className="text-on-surface-variant">Recibió: {p.personaRecibe}</p>
                                        )}
                                        <p className="text-outline">{p.cantidad} ud. · salida {formatFecha(p.fechaSalida)}</p>
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
                      <tr className="bg-primary-50 border-t-2 border-primary/20">
                        <td className="px-4 py-2.5 text-xs font-bold text-primary uppercase">Total filtrado</td>
                        <td className="text-center px-3 py-2.5 font-bold text-primary">{catalogoFiltrado.reduce((s, i) => s + i.total, 0)}</td>
                        <td className="text-center px-3 py-2.5 font-bold text-[#006D37]">{catalogoFiltrado.reduce((s, i) => s + i.buenas, 0)}</td>
                        <td className="text-center px-3 py-2.5 font-bold text-[#835100]">{catalogoFiltrado.reduce((s, i) => s + i.entregadas, 0)}</td>
                        <td className="text-center px-3 py-2.5 font-bold text-[#835100]">{catalogoFiltrado.reduce((s, i) => s + i.danadas, 0)}</td>
                        <td className="text-center px-3 py-2.5 font-bold text-primary">{catalogoFiltrado.reduce((s, i) => s + (i.stock_almacen ?? 0), 0)}</td>
                        <td className="text-center px-3 py-2.5 font-bold text-error">
                          {catalogoFiltrado.reduce((s, i) => s + (i.en_prestamo ?? (prestamosPorNombre[i.nombre.toLowerCase()] || []).reduce((ss, p) => ss + p.cantidad, 0)), 0)}
                        </td>
                        <td className="text-center px-3 py-2.5 font-bold text-[#006D37]">
                          {catalogoFiltrado.reduce((s, i) => s + (i.disponible ?? Math.max(0, i.buenas - (prestamosPorNombre[i.nombre.toLowerCase()] || []).reduce((ss, p) => ss + p.cantidad, 0))), 0)}
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

      <Modal
        open={mostrarFormItem}
        onClose={() => setMostrarFormItem(false)}
        title="Agregar ítem al inventario"
        subtitle="Registra una entrada de stock en el almacén"
        icon={<MdInventory className="text-primary text-xl" />}
      >
        <form onSubmit={handleAgregarItem} className="flex flex-col gap-4">
          <div>
            <label className="label">Tipo de ítem</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPO_ITEM_OPTS.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition ${
                    formItem.tipo === t.value ? 'border-primary bg-primary-50 text-primary' : 'border-outline-variant text-on-surface-variant hover:border-outline-variant'
                  }`}
                >
                  <input type="radio" className="sr-only" checked={formItem.tipo === t.value} onChange={() => setFormItem({ ...formItem, tipo: t.value })} />
                  {t.icon} {t.label}
                </label>
              ))}
            </div>
          </div>

          <Input
            label="Nombre del ítem"
            required
            placeholder="Ej: Martillo, Casco EPP, Tornillo 3/8…"
            value={formItem.nombre_item}
            onChange={(e) => setFormItem({ ...formItem, nombre_item: e.target.value })}
          />

          <Input
            label="Cantidad"
            type="number"
            min={1}
            max={9999}
            required
            value={formItem.cantidad}
            onChange={(e) => setFormItem({ ...formItem, cantidad: e.target.value })}
            help="Stock que se agrega al almacén. Mínimo 1."
          />

          <div>
            <label className="label">Observaciones <span className="text-outline font-normal">(opcional)</span></label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Ej: donación, compra de emergencia, proveedor…"
              value={formItem.observaciones}
              onChange={(e) => setFormItem({ ...formItem, observaciones: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={enviandoItem}>
            <MdSend /> {enviandoItem ? 'Registrando…' : 'Agregar al inventario'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
