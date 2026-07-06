import { useEffect, useMemo, useState } from 'react';
import {
  MdAdminPanelSettings,
  MdArrowBack,
  MdArrowForward,
  MdEmergency,
  MdExpandLess,
  MdExpandMore,
  MdFilterAltOff,
  MdHistory,
  MdManageAccounts,
  MdPerson,
  MdRefresh,
  MdSearch,
  MdShield,
  MdUpdate,
} from 'react-icons/md';
import Navbar from '../components/Navbar';
import { obtenerAuditorias } from '../services/auditoriaService';

const ETIQUETAS_ACCION = {
  CREAR_USUARIO: 'Crear usuario',
  REGISTRO_PUBLICO: 'Registro público',
  ACTUALIZAR_USUARIO: 'Actualizar usuario',
  ACTIVAR_USUARIO: 'Activar usuario',
  DESACTIVAR_USUARIO: 'Desactivar usuario',
  CREAR_EMERGENCIA: 'Crear emergencia',
  ACTUALIZAR_EMERGENCIA: 'Actualizar emergencia',
  FINALIZAR_EMERGENCIA: 'Finalizar emergencia',
  REGISTRAR_FAMILIA: 'Registrar familia',
  REGISTRAR_EVALUACION: 'Registrar evaluación',
};

const ETIQUETAS_CAMPO = {
  nombre: 'Nombre',
  rut: 'RUT',
  correo: 'Correo',
  rol: 'Rol',
  activo: 'Estado activo',
  descripcion: 'Descripción',
  direccion: 'Dirección',
  lat: 'Latitud',
  lng: 'Longitud',
  estado: 'Estado',
  fecha_fin: 'Fecha de cierre',
  prioridad: 'Prioridad',
  miembros: 'Miembros',
};

function formatearAccion(accion) {
  return ETIQUETAS_ACCION[accion] || String(accion || '').replaceAll('_', ' ').toLowerCase();
}

function formatearValor(valor) {
  if (valor === null || valor === undefined || valor === '') return 'Sin valor';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return String(fecha);
  return valor.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function claseModulo(modulo) {
  return modulo === 'usuarios'
    ? 'bg-primary-fixed text-primary-dark border-primary-fixed-dim'
    : 'bg-tertiary-container text-on-error-container border-tertiary-fixed-dim';
}

function DetalleAuditoria({ detalles }) {
  if (!detalles || Object.keys(detalles).length === 0) {
    return <p className="text-sm text-on-surface-variant">No hay detalles adicionales.</p>;
  }

  const cambios = detalles.cambios;
  const otrosDetalles = Object.entries(detalles).filter(([clave]) => clave !== 'cambios');

  return (
    <div className="space-y-4">
      {cambios && Object.keys(cambios).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Campos modificados
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(cambios).map(([campo, valores]) => (
              <div key={campo} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
                <p className="text-xs font-bold text-on-surface">
                  {ETIQUETAS_CAMPO[campo] || campo}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-error-container/60 p-2 text-on-error-container">
                    <span className="block font-bold">Antes</span>
                    <span className="break-words">{formatearValor(valores?.antes)}</span>
                  </div>
                  <div className="rounded-md bg-primary-fixed p-2 text-primary-dark">
                    <span className="block font-bold">Después</span>
                    <span className="break-words">{formatearValor(valores?.despues)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {otrosDetalles.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Información registrada
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {otrosDetalles.map(([campo, valor]) => (
              <div key={campo} className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                  {ETIQUETAS_CAMPO[campo] || campo.replaceAll('_', ' ')}
                </p>
                <p className="mt-1 break-words text-sm font-medium text-on-surface">
                  {formatearValor(valor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistorialAuditorias() {
  const [auditorias, setAuditorias] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modulo, setModulo] = useState('todos');
  const [accion, setAccion] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [expandida, setExpandida] = useState(null);
  const limite = 15;

  const cargar = async () => {
    try {
      setCargando(true);
      setError('');
      const respuesta = await obtenerAuditorias({
        modulo,
        accion,
        busqueda: busquedaAplicada,
        pagina,
        limite,
      });

      const datos = respuesta?.datos || {};
      setAuditorias(Array.isArray(datos.auditorias) ? datos.auditorias : []);
      setAcciones(Array.isArray(datos.acciones) ? datos.acciones : []);
      setTotal(Number(datos.total) || 0);
      setTotalPaginas(Math.max(1, Number(datos.totalPaginas) || 1));
    } catch (err) {
      setAuditorias([]);
      setError(err.message || 'No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [modulo, accion, busquedaAplicada, pagina]);

  useEffect(() => {
    setPagina(1);
  }, [modulo, accion, busquedaAplicada]);

  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas);
    }
  }, [pagina, totalPaginas]);

  const resumenPagina = useMemo(() => {
    const usuarios = auditorias.filter((item) => item.modulo === 'usuarios').length;
    const emergencias = auditorias.filter((item) => item.modulo === 'emergencias').length;
    const actores = new Set(auditorias.map((item) => item.actor_nombre).filter(Boolean)).size;
    return { usuarios, emergencias, actores };
  }, [auditorias]);

  const aplicarBusqueda = (event) => {
    event.preventDefault();
    setBusquedaAplicada(busqueda.trim());
  };

  const limpiarFiltros = () => {
    setModulo('todos');
    setAccion('todos');
    setBusqueda('');
    setBusquedaAplicada('');
    setPagina(1);
  };

  const inicio = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const fin = Math.min(pagina * limite, total);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      <main className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <section className="relative mb-8 overflow-hidden rounded-2xl bg-neutral p-6 text-white shadow-card md:p-8">
          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-primary/30" />
          <div className="absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-tertiary/25" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/80">
                <MdShield /> Control y trazabilidad
              </div>
              <h1 className="flex items-center gap-3 text-2xl font-extrabold md:text-4xl">
                <MdHistory className="text-primary" />
                Historial de Auditorías
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/70 md:text-base">
                Consulta quién realizó cada cambio sobre usuarios y emergencias, con fecha, hora y detalle histórico.
              </p>
            </div>
            <button
              type="button"
              onClick={cargar}
              disabled={cargando}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <MdRefresh className={cargando ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Resultados</span>
              <MdHistory className="text-2xl text-primary" />
            </div>
            <strong className="mt-3 block text-3xl text-on-surface">{total}</strong>
          </article>
          <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Usuarios en página</span>
              <MdManageAccounts className="text-2xl text-primary-dark" />
            </div>
            <strong className="mt-3 block text-3xl text-primary-dark">{resumenPagina.usuarios}</strong>
          </article>
          <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Emergencias en página</span>
              <MdEmergency className="text-2xl text-tertiary" />
            </div>
            <strong className="mt-3 block text-3xl text-tertiary">{resumenPagina.emergencias}</strong>
          </article>
          <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Actores en página</span>
              <MdAdminPanelSettings className="text-2xl text-on-surface-variant" />
            </div>
            <strong className="mt-3 block text-3xl text-on-surface">{resumenPagina.actores}</strong>
          </article>
        </section>

        <section className="mb-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
          <form onSubmit={aplicarBusqueda} className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_260px_auto]">
            <label className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar actor, elemento o descripción..."
                className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>

            <select
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="todos">Todos los módulos</option>
              <option value="usuarios">Usuarios</option>
              <option value="emergencias">Emergencias</option>
            </select>

            <select
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="todos">Todas las acciones</option>
              {acciones.map((item) => (
                <option key={item} value={item}>{formatearAccion(item)}</option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-dark"
            >
              <MdSearch /> Buscar
            </button>
          </form>

          {(modulo !== 'todos' || accion !== 'todos' || busquedaAplicada) && (
            <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-4">
              <span className="text-sm text-on-surface-variant">Filtros activos</span>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
              >
                <MdFilterAltOff /> Limpiar filtros
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Fecha y hora</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Módulo</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Acción</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Elemento afectado</th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Realizado por</th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {cargando && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-sm text-on-surface-variant">
                      Cargando historial de auditorías...
                    </td>
                  </tr>
                )}

                {!cargando && auditorias.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-sm text-on-surface-variant">
                      No hay auditorías que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                )}

                {!cargando && auditorias.map((item) => {
                  const abierta = expandida === item.id;
                  return (
                    <FragmentoAuditoria
                      key={item.id}
                      item={item}
                      abierta={abierta}
                      onToggle={() => setExpandida(abierta ? null : item.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-on-surface-variant">
              Mostrando {inicio} a {fin} de {total} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                disabled={pagina === 1}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MdArrowBack /> Anterior
              </button>
              <span className="min-w-24 text-center text-sm font-bold text-on-surface">
                {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                disabled={pagina >= totalPaginas}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente <MdArrowForward />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FragmentoAuditoria({ item, abierta, onToggle }) {
  return (
    <>
      <tr className="transition hover:bg-surface/80">
        <td className="px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-on-surface">
            <MdUpdate className="shrink-0 text-lg text-on-surface-variant" />
            {formatearFecha(item.creado_en)}
          </div>
        </td>
        <td className="px-5 py-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${claseModulo(item.modulo)}`}>
            {item.modulo === 'usuarios' ? <MdManageAccounts /> : <MdEmergency />}
            {item.modulo === 'usuarios' ? 'Usuarios' : 'Emergencias'}
          </span>
        </td>
        <td className="px-5 py-4">
          <span className="text-sm font-bold text-on-surface">{formatearAccion(item.accion)}</span>
          {item.descripcion && (
            <p className="mt-1 max-w-[280px] truncate text-xs text-on-surface-variant">{item.descripcion}</p>
          )}
        </td>
        <td className="px-5 py-4">
          <p className="text-sm font-semibold text-on-surface">{item.entidad_nombre || 'Sin nombre'}</p>
          {item.entidad_id && <p className="text-xs text-on-surface-variant">ID #{item.entidad_id}</p>}
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
              <MdPerson />
            </span>
            <div>
              <p className="text-sm font-semibold text-on-surface">{item.actor_nombre || 'Sistema'}</p>
              <p className="text-xs capitalize text-on-surface-variant">{item.actor_rol || 'sin rol'}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-4 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-bold text-primary transition hover:bg-primary-fixed"
          >
            {abierta ? <MdExpandLess /> : <MdExpandMore />}
            {abierta ? 'Ocultar' : 'Ver'}
          </button>
        </td>
      </tr>
      {abierta && (
        <tr className="bg-surface-container-low/70">
          <td colSpan="6" className="px-5 py-5">
            <DetalleAuditoria detalles={item.detalles} />
          </td>
        </tr>
      )}
    </>
  );
}
