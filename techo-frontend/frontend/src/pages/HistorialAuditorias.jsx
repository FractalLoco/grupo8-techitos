import { useEffect, useMemo, useState } from 'react';
import {
  MdAdminPanelSettings,
  MdArrowBack,
  MdArrowForward,
  MdAssignment,
  MdCheckCircle,
  MdChevronRight,
  MdClose,
  MdEdit,
  MdEmergency,
  MdFamilyRestroom,
  MdFilterAltOff,
  MdHistory,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdManageAccounts,
  MdPerson,
  MdPersonAdd,
  MdRefresh,
  MdSchedule,
  MdSearch,
  MdSecurity,
  MdToggleOff,
  MdToggleOn,
  MdWarning,
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
  cantidad_integrantes: 'Cantidad de integrantes',
  credencial_acceso: 'Credencial de acceso',
  estado_anterior: 'Estado anterior',
  estado_nuevo: 'Estado nuevo',
  credenciales_enviadas_por_correo: 'Credenciales enviadas por correo',
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

// Los IDs son internos y no aportan valor a la vista de auditoría para usuarios
// ni emergencias. Se ocultan tanto en el resumen como dentro del detalle expandido.
function esCampoIdOculto(campo, modulo) {
  if (!['usuarios', 'emergencias'].includes(modulo)) return false;
  const clave = String(campo || '').trim().toLowerCase();
  return clave === 'id' || clave.endsWith('_id');
}

function limpiarIdsDeTexto(texto, modulo) {
  if (!texto || !['usuarios', 'emergencias'].includes(modulo)) return texto || '';

  return String(texto)
    .replace(/\s*\(\s*ID\s*#?\s*\d+\s*\)/gi, '')
    .replace(/\s*[–—-]?\s*ID\s*#?\s*\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
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

function formatearTiempoRelativo(fecha) {
  if (!fecha) return 'Sin fecha';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'Sin fecha';

  const diferenciaSegundos = Math.round((valor.getTime() - Date.now()) / 1000);
  const absoluto = Math.abs(diferenciaSegundos);
  const formato = new Intl.RelativeTimeFormat('es-CL', { numeric: 'auto' });

  if (absoluto < 60) return formato.format(diferenciaSegundos, 'second');

  const minutos = Math.round(diferenciaSegundos / 60);
  if (Math.abs(minutos) < 60) return formato.format(minutos, 'minute');

  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return formato.format(horas, 'hour');

  const dias = Math.round(horas / 24);
  if (Math.abs(dias) < 30) return formato.format(dias, 'day');

  const meses = Math.round(dias / 30);
  if (Math.abs(meses) < 12) return formato.format(meses, 'month');

  const anios = Math.round(dias / 365);
  return formato.format(anios, 'year');
}

function obtenerIniciales(nombre) {
  return String(nombre || 'Sistema')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

function configuracionAccion(item) {
  const accion = item?.accion;

  if (accion === 'CREAR_USUARIO' || accion === 'REGISTRO_PUBLICO') {
    return {
      Icono: MdPersonAdd,
      circulo: 'bg-primary/10 text-primary',
      borde: 'hover:border-primary/40',
      etiqueta: 'bg-primary/10 text-primary',
    };
  }

  if (accion === 'ACTIVAR_USUARIO') {
    return {
      Icono: MdToggleOn,
      circulo: 'bg-primary/10 text-primary',
      borde: 'hover:border-primary/40',
      etiqueta: 'bg-primary/10 text-primary',
    };
  }

  if (accion === 'DESACTIVAR_USUARIO') {
    return {
      Icono: MdToggleOff,
      circulo: 'bg-error-container text-error',
      borde: 'hover:border-error/40',
      etiqueta: 'bg-error-container/70 text-error',
    };
  }

  if (accion === 'FINALIZAR_EMERGENCIA') {
    return {
      Icono: MdWarning,
      circulo: 'bg-secondary/10 text-secondary',
      borde: 'hover:border-secondary/40',
      etiqueta: 'bg-secondary/10 text-secondary',
    };
  }

  if (accion === 'REGISTRAR_FAMILIA') {
    return {
      Icono: MdFamilyRestroom,
      circulo: 'bg-tertiary/10 text-tertiary',
      borde: 'hover:border-tertiary/40',
      etiqueta: 'bg-tertiary/10 text-tertiary',
    };
  }

  if (accion === 'REGISTRAR_EVALUACION') {
    return {
      Icono: MdAssignment,
      circulo: 'bg-tertiary/10 text-tertiary',
      borde: 'hover:border-tertiary/40',
      etiqueta: 'bg-tertiary/10 text-tertiary',
    };
  }

  return {
    Icono: item?.modulo === 'emergencias' ? MdEmergency : MdEdit,
    circulo: 'bg-surface-tint/10 text-surface-tint',
    borde: 'hover:border-surface-tint/40',
    etiqueta: 'bg-surface-tint/10 text-surface-tint',
  };
}

function DetalleAuditoria({ detalles, modulo }) {
  if (!detalles || Object.keys(detalles).length === 0) {
    return <p className="text-sm text-on-surface-variant">No hay detalles adicionales.</p>;
  }

  const cambios = detalles.cambios
    ? Object.fromEntries(
        Object.entries(detalles.cambios).filter(
          ([campo]) => !esCampoIdOculto(campo, modulo)
        )
      )
    : null;

  const otrosDetalles = Object.entries(detalles).filter(
    ([clave]) => clave !== 'cambios' && !esCampoIdOculto(clave, modulo)
  );

  const hayCambios = cambios && Object.keys(cambios).length > 0;

  if (!hayCambios && otrosDetalles.length === 0) {
    return <p className="text-sm text-on-surface-variant">No hay detalles adicionales visibles.</p>;
  }

  return (
    <div className="space-y-4">
      {hayCambios && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Campos modificados
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(cambios).map(([campo, valores]) => (
              <div
                key={campo}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
              >
                <p className="text-xs font-bold text-on-surface">
                  {ETIQUETAS_CAMPO[campo] || campo.replaceAll('_', ' ')}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-error-container/60 p-2 text-on-error-container">
                    <span className="block font-bold">Antes</span>
                    <span className="break-words">{formatearValor(valores?.antes)}</span>
                  </div>
                  <div className="rounded-md bg-primary-fixed p-2 text-on-primary-fixed-variant">
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
              <div
                key={campo}
                className="rounded-lg border border-outline-variant bg-surface-container-low p-3"
              >
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
  const [mensajeExito, setMensajeExito] = useState(null);
  const [modulo, setModulo] = useState('todos');
  const [accion, setAccion] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [expandida, setExpandida] = useState(null);
  const limite = 10;

  const cargar = async ({ mostrarExito = false } = {}) => {
    try {
      setCargando(true);
      setError('');

      const respuesta = await obtenerAuditorias({
        modulo,
        accion,
        busqueda: busquedaAplicada,
        fechaDesde,
        fechaHasta,
        pagina,
        limite,
      });

      const datos = respuesta?.datos || {};
      setAuditorias(Array.isArray(datos.auditorias) ? datos.auditorias : []);
      setAcciones(Array.isArray(datos.acciones) ? datos.acciones : []);
      setTotal(Number(datos.total) || 0);
      setTotalPaginas(Math.max(1, Number(datos.totalPaginas) || 1));

      if (mostrarExito) {
        setMensajeExito({
          titulo: 'Historial actualizado con éxito',
          detalle: 'El historial de auditoría se ha actualizado correctamente.',
          marcaTiempo: Date.now(),
        });
      }
    } catch (err) {
      setAuditorias([]);
      setError(err.message || 'No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [modulo, accion, busquedaAplicada, fechaDesde, fechaHasta, pagina]);

  useEffect(() => {
    if (!mensajeExito) return undefined;

    const temporizador = window.setTimeout(() => {
      setMensajeExito(null);
    }, 4500);

    return () => window.clearTimeout(temporizador);
  }, [mensajeExito]);

  useEffect(() => {
    setPagina(1);
  }, [modulo, accion, busquedaAplicada, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const resumenPagina = useMemo(() => {
    const usuarios = auditorias.filter((item) => item.modulo === 'usuarios').length;
    const emergencias = auditorias.filter((item) => item.modulo === 'emergencias').length;
    const actores = new Set(auditorias.map((item) => item.actor_nombre).filter(Boolean)).size;
    return { usuarios, emergencias, actores };
  }, [auditorias]);

  const aplicarBusqueda = (event) => {
    event.preventDefault();
    setPagina(1);
    setBusquedaAplicada(busqueda.trim());
  };

  const limpiarFiltros = () => {
    setModulo('todos');
    setAccion('todos');
    setBusqueda('');
    setBusquedaAplicada('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
  };

  const inicio = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const fin = Math.min(pagina * limite, total);
  const hayFiltros =
    modulo !== 'todos' ||
    accion !== 'todos' ||
    busquedaAplicada ||
    fechaDesde ||
    fechaHasta;

  return (
    <div className="min-h-screen bg-surface text-on-background">
      <Navbar />

      <main className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div
          className="mb-4 flex min-h-20 items-center justify-center py-2 pointer-events-none select-none"
          aria-label="Logo de TECHO Chile"
        >
          <img
            src="/logo-techo-color-oficial.svg"
            alt="TECHO Chile"
            className="h-14 w-auto object-contain animate-techo-logo-energetic"
          />
        </div>

        {mensajeExito && (
          <section
            key={mensajeExito.marcaTiempo}
            role="status"
            aria-live="polite"
            className="animate-audit-success-in mb-6 flex items-center justify-between gap-4 rounded-xl border border-green-600/20 bg-green-50 p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <MdCheckCircle className="text-xl" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-green-700">
                  {mensajeExito.titulo}
                </p>
                <p className="mt-0.5 text-xs text-green-700/80">
                  {mensajeExito.detalle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMensajeExito(null)}
              className="shrink-0 rounded-full p-1.5 text-green-700 transition-colors hover:bg-green-600/10"
              aria-label="Cerrar mensaje de éxito"
            >
              <MdClose className="text-xl" />
            </button>
          </section>
        )}

        <section className="relative mb-10 overflow-hidden rounded-xl bg-inverse-surface p-6 text-white shadow-lg md:p-8">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/20" />
          <div className="absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-tertiary/10" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-fixed">
                <MdSecurity /> Control y trazabilidad
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                Historial de Auditorías
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
                Consulte quién realizó cada cambio sobre usuarios y emergencias, con fecha, hora y acciones para garantizar la transparencia institucional.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <form onSubmit={aplicarBusqueda} className="relative min-w-0 flex-1 lg:w-72">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-white/50" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar actor o detalle..."
                  className="w-full rounded-lg border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </form>

              <button
                type="button"
                onClick={() => cargar({ mostrarExito: true })}
                disabled={cargando}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-container disabled:opacity-50"
              >
                <MdRefresh className={cargando ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>
          </div>
        </section>

        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaResumen
            icono={<MdHistory />}
            iconoClase="bg-primary/10 text-primary"
            etiqueta="Total registros"
            valor={total}
          />
          <TarjetaResumen
            icono={<MdManageAccounts />}
            iconoClase="bg-tertiary/10 text-tertiary"
            etiqueta="Auditorías de usuarios"
            valor={resumenPagina.usuarios}
            nota="En esta página"
          />
          <TarjetaResumen
            icono={<MdEmergency />}
            iconoClase="bg-secondary/10 text-secondary"
            etiqueta="Emergencias auditadas"
            valor={resumenPagina.emergencias}
            nota="En esta página"
          />
          <TarjetaResumen
            icono={<MdAdminPanelSettings />}
            iconoClase="bg-surface-tint/10 text-surface-tint"
            etiqueta="Actores registrados"
            valor={resumenPagina.actores}
            nota="En esta página"
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-variant bg-surface-container-low p-5 md:p-6">
            <div className="flex flex-1 flex-wrap items-end gap-4">
              <CampoFiltro etiqueta="Módulo">
                <select
                  value={modulo}
                  onChange={(e) => setModulo(e.target.value)}
                  className="min-w-48 rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="todos">Todos los módulos</option>
                  <option value="usuarios">Usuarios</option>
                  <option value="emergencias">Emergencias</option>
                </select>
              </CampoFiltro>

              <CampoFiltro etiqueta="Acción">
                <select
                  value={accion}
                  onChange={(e) => setAccion(e.target.value)}
                  className="min-w-56 rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="todos">Todas las acciones</option>
                  {acciones.map((item) => (
                    <option key={item} value={item}>
                      {formatearAccion(item)}
                    </option>
                  ))}
                </select>
              </CampoFiltro>

              <CampoFiltro etiqueta="Rango de fecha">
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <input
                    type="date"
                    value={fechaDesde}
                    max={fechaHasta || undefined}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    aria-label="Fecha desde"
                  />
                  <span className="hidden text-on-surface-variant sm:inline">–</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde || undefined}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    aria-label="Fecha hasta"
                  />
                </div>
              </CampoFiltro>
            </div>

            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={!hayFiltros}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MdFilterAltOff className="text-xl" />
              Limpiar filtros
            </button>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
              {error}
            </div>
          )}

          <div className="p-5 md:p-8">
            {cargando && (
              <div className="py-16 text-center text-sm text-on-surface-variant">
                Cargando historial de auditorías...
              </div>
            )}

            {!cargando && auditorias.length === 0 && (
              <div className="py-16 text-center">
                <MdHistory className="mx-auto text-5xl text-outline-variant" />
                <p className="mt-3 text-sm text-on-surface-variant">
                  No hay auditorías que coincidan con los filtros seleccionados.
                </p>
              </div>
            )}

            {!cargando && auditorias.length > 0 && (
              <div className="space-y-0">
                {auditorias.map((item, indice) => {
                  const abierta = expandida === item.id;
                  return (
                    <ElementoTimeline
                      key={item.id}
                      item={item}
                      abierta={abierta}
                      esUltimo={indice === auditorias.length - 1}
                      onToggle={() => setExpandida(abierta ? null : item.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-outline-variant bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <p className="text-sm text-on-surface-variant">
              Mostrando {inicio} a {fin} de {total} registros
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                disabled={pagina === 1}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-40"
              >
                <MdArrowBack /> Anterior
              </button>
              <span className="min-w-20 rounded-lg bg-primary px-3 py-2 text-center text-sm font-bold text-white">
                {pagina} / {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                disabled={pagina >= totalPaginas}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container disabled:opacity-40"
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

function TarjetaResumen({ icono, iconoClase, etiqueta, valor, nota }) {
  return (
    <article className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-2xl ${iconoClase}`}>
          {icono}
        </span>
        {nota && <span className="text-xs font-bold text-on-surface-variant">{nota}</span>}
      </div>
      <p className="text-xs font-medium text-on-surface-variant">{etiqueta}</p>
      <p className="mt-1 text-3xl font-extrabold text-on-surface">{valor}</p>
    </article>
  );
}

function CampoFiltro({ etiqueta, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
        {etiqueta}
      </span>
      {children}
    </label>
  );
}

function ElementoTimeline({ item, abierta, esUltimo, onToggle }) {
  const config = configuracionAccion(item);
  const Icono = config.Icono;
  const descripcionVisible = limpiarIdsDeTexto(item.descripcion, item.modulo);

  return (
    <div className="relative pl-12">
      {!esUltimo && (
        <span className="absolute bottom-0 left-5 top-10 w-0.5 bg-surface-container-highest" />
      )}

      <span
        className={`absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xl shadow-sm ${config.circulo}`}
      >
        <Icono />
      </span>

      <article
        className={`mb-8 rounded-xl border border-outline-variant bg-white p-5 transition-colors ${config.borde}`}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${config.etiqueta}`}>
                {item.modulo === 'usuarios' ? 'Usuarios' : 'Emergencias'}
              </span>
              <h2 className="text-lg font-bold text-on-surface">
                {formatearAccion(item.accion)}
              </h2>
              <span className="text-on-surface-variant">•</span>
              <span className="text-sm text-on-surface-variant">
                {formatearTiempoRelativo(item.creado_en)}
              </span>
            </div>

            <div className="text-sm leading-6 text-on-surface-variant">
              {descripcionVisible ? (
                <p>{descripcionVisible}</p>
              ) : (
                <p>
                  Se registró una acción sobre{' '}
                  <span className="font-bold text-on-surface">
                    {item.entidad_nombre || 'un elemento del sistema'}
                  </span>.
                </p>
              )}

              {item.entidad_nombre && !descripcionVisible.includes(item.entidad_nombre) && (
                <p className="mt-1">
                  Elemento afectado:{' '}
                  <span className="font-bold text-on-surface">{item.entidad_nombre}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <MdSchedule className="text-base" />
              <span>{formatearFecha(item.creado_en)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 md:min-w-[210px] md:items-end">
            <div className="flex items-center gap-3">
              <div className="text-left md:text-right">
                <p className="text-xs font-bold text-on-surface">
                  {item.actor_nombre || 'Sistema'}
                </p>
                <p className="mt-0.5 text-[10px] capitalize text-on-surface-variant">
                  {String(item.actor_rol || 'sin rol').replaceAll('_', ' ')}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant">
                {obtenerIniciales(item.actor_nombre)}
              </span>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="group inline-flex items-center gap-1 text-sm font-bold text-primary transition hover:underline"
            >
              {abierta ? 'Ocultar detalle' : 'Ver detalle'}
              {abierta ? (
                <MdKeyboardArrowUp className="text-xl" />
              ) : (
                <MdChevronRight className="text-xl transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </div>
        </div>

        {abierta && (
          <div className="mt-5 border-t border-outline-variant pt-5">
            <DetalleAuditoria detalles={item.detalles} modulo={item.modulo} />
          </div>
        )}
      </article>
    </div>
  );
}
