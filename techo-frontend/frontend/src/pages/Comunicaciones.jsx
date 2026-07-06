import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MdAdd,
  MdAnnouncement,
  MdArrowBack,
  MdBolt,
  MdCameraAlt,
  MdCheckCircle,
  MdClose,
  MdFlag,
  MdGroup,
  MdImage,
  MdInfo,
  MdInfoOutline,
  MdMenu,
  MdPriorityHigh,
  MdSearch,
  MdSend,
  MdWarning,
} from 'react-icons/md';
import { useAutenticacion } from '../context/AuthContext';
import {
  enviarEmergencia,
  enviarFotoCanalCoordinador,
  enviarFotoAvance,
  enviarMensaje,
  marcarAvance,
  obtenerBroadcast,
  obtenerChatCoordinadores,
  obtenerChatJefes,
  obtenerCuadrillasAccesibles,
  obtenerIntegrantesCuadrilla,
  obtenerMensajesCuadrilla,
  obtenerUrlArchivo,
  enviarMensajeCoordinadores,
  enviarMensajeJefes,
  conectarChatTiempoReal,
} from '../services/comunicacionesService';

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const INTERVALO_POLLING = 5000;
const FORMATO_FECHA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function SidebarComunicaciones({
  abierto, usuario, canal, cuadrillaId, cuadrillas, cargandoCuadrillas,
  onCerrar, onSeleccionarBroadcast, onSeleccionarCoordinadores, onSeleccionarJefes,
  onSeleccionarCuadrilla,
}) {
  const navigate = useNavigate();
  const [busquedaCuadrilla, setBusquedaCuadrilla] = useState('');
  const cuadrillasFiltradas = cuadrillas.filter((cuadrilla) => {
    const termino = busquedaCuadrilla.trim().toLocaleLowerCase('es');
    if (!termino) return true;
    return [cuadrilla.nombre, cuadrilla.estado]
      .filter(Boolean)
      .some((valor) => String(valor).toLocaleLowerCase('es').includes(termino));
  });
  return (
    <>
      {abierto && <button type="button" className="fixed inset-0 z-[3900] bg-slate-950/55 xl:hidden" onClick={onCerrar} aria-label="Cerrar canales" />}
      <aside className={`fixed inset-y-0 left-0 z-[4000] flex w-[278px] flex-col bg-gradient-to-b from-techo-primaryDark to-techo-primary text-white shadow-2xl transition-transform xl:static xl:z-auto xl:translate-x-0 ${abierto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex min-h-[72px] items-center justify-between border-b border-white/10 px-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-techo-secondary">TECHO</p><h2 className="text-lg font-bold">Comunicaciones</h2></div>
          <button type="button" onClick={onCerrar} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10 xl:hidden" aria-label="Cerrar canales"><MdClose size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/45">Canales</p>
          <button type="button" onClick={onSeleccionarBroadcast} className={`mb-4 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold ${canal === 'broadcast' ? 'bg-techo-secondary' : 'text-white/75 hover:bg-white/10'}`}><MdAnnouncement size={20} /> Avisos generales</button>
          {usuario?.rol === 'coordinador' && (
            <button type="button" onClick={onSeleccionarCoordinadores} className={`mb-4 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold ${canal === 'coordinadores' ? 'bg-techo-secondary' : 'text-white/75 hover:bg-white/10'}`}><MdGroup size={20} /> Chat de coordinadores</button>
          )}
          {['coordinador', 'jefe_cuadrilla'].includes(usuario?.rol) && (
            <button type="button" onClick={onSeleccionarJefes} className={`mb-4 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold ${canal === 'jefes' ? 'bg-techo-secondary' : 'text-white/75 hover:bg-white/10'}`}><MdGroup size={20} /> Chat de jefes</button>
          )}
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/45">Cuadrillas</p>
          <label className="mb-3 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 focus-within:border-techo-secondary focus-within:ring-2 focus-within:ring-techo-secondary/30">
            <MdSearch size={20} className="shrink-0 text-white/55" aria-hidden="true" />
            <input
              type="search"
              value={busquedaCuadrilla}
              onChange={(evento) => setBusquedaCuadrilla(evento.target.value)}
              placeholder="Buscar cuadrilla..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              aria-label="Buscar cuadrilla"
            />
          </label>
          {cargandoCuadrillas ? <p className="px-3 py-4 text-xs text-white/50">Cargando cuadrillas...</p>
            : cuadrillas.length === 0 ? <p className="px-3 py-4 text-xs text-white/50">No tienes cuadrillas activas disponibles.</p>
              : cuadrillasFiltradas.length === 0 ? <p className="px-3 py-4 text-xs text-white/50">No se encontraron cuadrillas.</p>
              : cuadrillasFiltradas.map((cuadrilla) => {
                const activa = canal === 'cuadrilla' && Number(cuadrillaId) === cuadrilla.id;
                return (
                  <button type="button" key={cuadrilla.id} onClick={() => onSeleccionarCuadrilla(cuadrilla.id)} className={`mb-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left ${activa ? 'bg-white/15' : 'text-white/70 hover:bg-white/10'}`}>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${activa ? 'bg-techo-secondary' : 'bg-white/10'}`}><MdGroup size={19} /></span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{cuadrilla.nombre}</span><span className="block text-[10px] capitalize text-white/45">{cuadrilla.estado || 'Activa'}</span></span>
                  </button>
                );
              })}
        </div>
        <div className="space-y-3 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-black/10 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-techo-secondary font-bold">{(usuario?.nombre || 'U')[0].toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{usuario?.nombre || 'Usuario'}</span><span className="block text-[10px] capitalize text-white/50">{usuario?.rol?.replace('_', ' ')}</span></span>
          </div>
          <button type="button" onClick={() => navigate('/inicio')} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 text-sm font-semibold hover:bg-white/20"><MdArrowBack size={20} /> Volver al inicio</button>
        </div>
      </aside>
    </>
  );
}

function EncabezadoCanal({ canal, cuadrilla, onAbrirCanales, onAbrirInformacion }) {
  const descripcion = canal === 'broadcast'
    ? 'Avisos generales para todos los usuarios activos'
    : canal === 'coordinadores'
      ? 'Canal privado exclusivo para coordinadores'
      : canal === 'jefes'
        ? 'Canal privado de jefes, visible para coordinación'
      : [cuadrilla?.estado, cuadrilla?.fase].filter(Boolean).join(' · ') || 'Canal privado de cuadrilla';
  return (
    <header className="flex min-h-[72px] items-center gap-3 border-b border-slate-200 px-3 sm:px-5">
      <button type="button" onClick={onAbrirCanales} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100 xl:hidden" aria-label="Abrir canales"><MdMenu size={24} /></button>
      <div className="min-w-0 flex-1"><h1 className="truncate text-lg font-bold text-techo-primary">{canal === 'broadcast' ? 'Avisos generales' : canal === 'coordinadores' ? 'Chat de coordinadores' : canal === 'jefes' ? 'Chat de jefes' : cuadrilla?.nombre || 'Cuadrilla'}</h1><p className="truncate text-xs capitalize text-slate-500">{descripcion}</p></div>
      <button type="button" onClick={onAbrirInformacion} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100 2xl:hidden" aria-label="Abrir información"><MdInfoOutline size={23} /></button>
    </header>
  );
}

const ESTILO_TIPO = {
  avance: ['Avance', 'border-emerald-200 bg-emerald-50', 'bg-emerald-100 text-emerald-700', MdCheckCircle],
  finalizado: ['Finalizado', 'border-green-300 bg-green-50', 'bg-green-600 text-white', MdCheckCircle],
  emergencia: ['Emergencia', 'border-red-300 bg-red-50 ring-1 ring-red-200', 'bg-red-600 text-white', MdWarning],
  imagen: ['Fotografía', 'border-slate-200 bg-white', 'bg-sky-100 text-sky-700', MdImage],
};

function TarjetaMensaje({ mensaje, usuario, canal, onAbrirImagen }) {
  const propio = mensaje.remitente_id === usuario?.id;
  const config = ESTILO_TIPO[mensaje.tipo];
  const Icono = config?.[3] || MdAnnouncement;
  const url = obtenerUrlArchivo(mensaje.archivo_url);
  return (
    <article className={`flex ${propio ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-[76%] ${propio ? 'border-techo-primary bg-techo-primary text-white' : config?.[1] || (canal === 'broadcast' ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white')}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <strong className="text-xs">{propio ? 'Tú' : mensaje.remitente_nombre || `Usuario ${mensaje.remitente_id || ''}`}</strong>
          {(config || ['broadcast', 'coordinadores', 'jefes'].includes(canal)) && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${config?.[2] || 'bg-sky-100 text-sky-700'}`}><Icono size={13} />{config?.[0] || (canal === 'coordinadores' ? 'Coordinadores' : canal === 'jefes' ? 'Jefes' : 'Aviso general')}</span>}
          {(mensaje.prioridad === true && mensaje.tipo !== 'emergencia') && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">Prioridad alta</span>}
        </div>
        {url && <button type="button" onClick={() => onAbrirImagen({ url, alt: mensaje.contenido || 'Evidencia fotográfica' })} className="block w-full overflow-hidden rounded-xl" aria-label="Abrir fotografía"><img src={url} alt={mensaje.contenido || 'Evidencia fotográfica'} className="max-h-80 w-full object-cover" loading="lazy" /></button>}
        {mensaje.contenido && <p className={`whitespace-pre-wrap break-words text-sm ${url ? 'mt-3' : ''}`}>{mensaje.contenido}</p>}
        <time className={`mt-2 block text-[11px] ${propio ? 'text-white/65' : 'text-slate-400'}`}>{mensaje.creado_en ? FORMATO_FECHA.format(new Date(mensaje.creado_en)) : 'Reciente'}</time>
      </div>
    </article>
  );
}

const ListaMensajes = forwardRef(({ mensajes, usuario, canal, onAbrirImagen, onScroll, cargando }, ref) => (
  <div ref={ref} onScroll={onScroll} className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-6">
    {cargando && mensajes.length === 0 ? <div className="flex h-full items-center justify-center"><span className="h-9 w-9 animate-spin rounded-full border-4 border-sky-100 border-t-techo-secondary" /></div>
      : mensajes.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-slate-400"><MdInfo size={28} /><p className="mt-2 font-semibold">Todavía no hay mensajes</p></div>
        : mensajes.map((mensaje) => <TarjetaMensaje key={mensaje.id || `${mensaje.remitente_id}-${mensaje.creado_en}`} mensaje={mensaje} usuario={usuario} canal={canal} onAbrirImagen={onAbrirImagen} />)}
  </div>
));

function CompositorMensaje({
  usuario, canal, contenido, onContenido, onEnviar, cargando, prioridadAlta, onPrioridad,
  esEmergencia, registrarHito, hitoFinalizado, onAccion, foto, vistaPreviaFoto,
  inputFotoRef, onSeleccionFoto, onQuitarFoto,
}) {
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  const esJefe = usuario?.rol === 'jefe_cuadrilla' && canal === 'cuadrilla';
  const esCoordinador = usuario?.rol === 'coordinador';
  const puedeAdjuntarFoto = canal === 'cuadrilla'
    || (esCoordinador && ['broadcast', 'coordinadores'].includes(canal))
    || (usuario?.rol === 'jefe_cuadrilla' && canal === 'jefes');
  if (canal === 'broadcast' && !esCoordinador) {
    return <div className="border-t bg-slate-50 p-4 text-center text-sm text-slate-500">Solo coordinación puede publicar avisos generales.</div>;
  }
  if (canal === 'jefes' && esCoordinador) {
    return <div className="border-t bg-slate-50 p-4 text-center text-sm text-slate-500">Este canal es de solo lectura para coordinación.</div>;
  }
  const acciones = esJefe && (
    <>
      <button type="button" onClick={() => onAccion('avance')} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><MdBolt size={20} /> Avance</button>
      <button type="button" onClick={() => onAccion('finalizado')} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-green-700 hover:bg-green-50"><MdFlag size={20} /> Finalización</button>
      <button type="button" onClick={() => onAccion('emergencia')} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-red-700 hover:bg-red-50"><MdPriorityHigh size={20} /> Emergencia</button>
    </>
  );
  const modo = esEmergencia ? 'Emergencia' : registrarHito ? (hitoFinalizado ? 'Finalización' : 'Avance') : '';
  return (
    <form onSubmit={onEnviar} className="border-t border-slate-200 bg-white p-3 sm:p-4">
      {foto && <div className="mb-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3"><img src={vistaPreviaFoto} alt="Vista previa" className="h-16 w-20 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{foto.name}</p><p className="text-[11px] text-slate-500">{(foto.size / 1024 / 1024).toFixed(2)} MB</p></div><button type="button" onClick={onQuitarFoto} className="h-11 w-11 text-red-600" aria-label="Quitar fotografía"><MdClose size={21} /></button></div>}
      {(modo || prioridadAlta) && <div className="mb-2 flex gap-2">{modo && <button type="button" onClick={() => onAccion('normal')} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{modo} · Quitar</button>}{prioridadAlta && <button type="button" onClick={() => onPrioridad(false)} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Prioridad alta · Quitar</button>}</div>}
      <div className="flex items-end gap-2">
        {esJefe && <button type="button" onClick={() => setMostrarAcciones(!mostrarAcciones)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 md:hidden" aria-label="Mostrar acciones"><MdAdd size={25} /></button>}
        {puedeAdjuntarFoto && <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-techo-primary hover:bg-slate-200" aria-label="Adjuntar fotografía"><MdCameraAlt size={21} /><input ref={inputFotoRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={onSeleccionFoto} disabled={cargando} /></label>}
        <textarea rows={1} value={contenido} onChange={(e) => onContenido(e.target.value)} placeholder={esEmergencia ? 'Describe la emergencia...' : 'Escribe un mensaje...'} className="min-h-11 max-h-32 flex-1 resize-none rounded-xl border px-4 py-3 text-sm outline-none focus:border-techo-secondary" disabled={cargando} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
        <button type="submit" disabled={cargando} className="flex h-11 items-center gap-2 rounded-xl bg-techo-secondary px-4 font-semibold text-white disabled:opacity-60"><MdSend size={20} /><span className="hidden sm:inline">{cargando ? 'Enviando...' : 'Enviar'}</span></button>
      </div>
      {mostrarAcciones && <div className="mt-2 grid grid-cols-2 md:hidden">{acciones}</div>}
      <div className="mt-2 hidden flex-wrap items-center gap-1 md:flex">{acciones}{esCoordinador && <label className="ml-auto flex min-h-11 items-center gap-2 px-3 text-xs font-semibold"><input type="checkbox" checked={prioridadAlta} onChange={(e) => onPrioridad(e.target.checked)} /> Prioridad alta</label>}</div>
    </form>
  );
}

function PanelCuadrilla({
  abierto, canal, cuadrilla, integrantes,
  cargandoIntegrantes, errorIntegrantes, onCerrar,
}) {
  return (
    <>
      {abierto && <button type="button" className="fixed inset-0 z-[3900] bg-slate-950/45 2xl:hidden" onClick={onCerrar} aria-label="Cerrar información" />}
      <aside className={`fixed inset-y-0 right-0 z-[4000] w-[310px] overflow-y-auto border-l bg-white p-5 shadow-2xl transition-transform 2xl:static 2xl:translate-x-0 2xl:shadow-none ${abierto ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="mb-5 flex items-center justify-between"><h2 className="font-bold text-techo-primary">Información del canal</h2><button type="button" onClick={onCerrar} className="h-11 w-11 2xl:hidden" aria-label="Cerrar"><MdClose size={23} /></button></div>
        <section className="rounded-2xl border bg-slate-50 p-4"><MdInfo size={22} className="mb-3 text-techo-secondary" /><h3 className="font-bold">{canal === 'broadcast' ? 'Avisos generales' : canal === 'coordinadores' ? 'Chat de coordinadores' : canal === 'jefes' ? 'Chat de jefes' : cuadrilla?.nombre || 'Sin cuadrilla'}</h3><p className="mt-1 text-xs capitalize text-slate-500">{canal === 'broadcast' ? 'Canal general del sistema' : canal === 'coordinadores' ? 'Acceso exclusivo para coordinadores' : canal === 'jefes' ? 'Jefes escriben; coordinación solo visualiza' : [cuadrilla?.estado, cuadrilla?.fase].filter(Boolean).join(' · ') || 'Canal privado'}</p></section>
        {canal === 'cuadrilla' && (
          <section className="mt-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Integrantes</h3>
            {cargandoIntegrantes ? (
              <p className="text-sm text-slate-500">Cargando integrantes...</p>
            ) : errorIntegrantes ? (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorIntegrantes}</p>
            ) : integrantes.length === 0 ? (
              <p className="text-sm text-slate-500">Esta cuadrilla no tiene integrantes registrados.</p>
            ) : (
              <ul className="space-y-2">
                {integrantes.map((integrante) => (
                  <li key={integrante.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-techo-primary">
                      {(integrante.nombre || 'U').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-700">{integrante.nombre}</span>
                      <span className="block text-xs capitalize text-slate-400">{integrante.rol?.replace('_', ' ')}</span>
                    </span>
                    {integrante.es_jefe && <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold uppercase text-sky-700">Jefe</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </aside>
    </>
  );
}

function ModalImagen({ imagen, onCerrar }) {
  useEffect(() => {
    if (!imagen) return undefined;
    const cerrar = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [imagen, onCerrar]);
  if (!imagen) return null;
  return <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}><button type="button" onClick={onCerrar} className="absolute right-4 top-4 h-11 w-11 text-white" aria-label="Cerrar fotografía"><MdClose size={26} /></button><img src={imagen.url} alt={imagen.alt} className="max-h-[88vh] max-w-[94vw] rounded-2xl object-contain" /></div>;
}

function Comunicaciones() {
  const { usuario, token } = useAutenticacion();
  const [searchParams, setSearchParams] = useSearchParams();
  const [canal, setCanal] = useState(
    ['cuadrilla', 'coordinadores', 'jefes'].includes(searchParams.get('canal'))
      ? searchParams.get('canal')
      : 'broadcast',
  );
  const [cuadrillaId, setCuadrillaId] = useState(searchParams.get('cuadrillaId') || '');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [contenido, setContenido] = useState('');
  const [prioridadAlta, setPrioridadAlta] = useState(false);
  const [esEmergencia, setEsEmergencia] = useState(false);
  const [registrarHito, setRegistrarHito] = useState(false);
  const [hitoFinalizado, setHitoFinalizado] = useState(false);
  const [foto, setFoto] = useState(null);
  const [vistaPreviaFoto, setVistaPreviaFoto] = useState('');
  const [imagenModal, setImagenModal] = useState(null);
  const [cargandoCuadrillas, setCargandoCuadrillas] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [cargandoIntegrantes, setCargandoIntegrantes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [errorCuadrillas, setErrorCuadrillas] = useState('');
  const [errorAutoRefresh, setErrorAutoRefresh] = useState('');
  const [errorIntegrantes, setErrorIntegrantes] = useState('');
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const inputFotoRef = useRef(null);
  const listaMensajesRef = useRef(null);
  const montadoRef = useRef(true);
  const mantenerAlFinalRef = useRef(true);

  const agregarMensajeSinDuplicar = useCallback((mensajeNuevo) => {
    if (!mensajeNuevo) return;
    setMensajes((actuales) => (
      actuales.some((mensaje) => mensaje.id === mensajeNuevo.id)
        ? actuales
        : [...actuales, mensajeNuevo]
    ));
  }, []);

  const cuadrillaSeleccionada = useMemo(
    () => cuadrillas.find((cuadrilla) => cuadrilla.id === Number(cuadrillaId)),
    [cuadrillas, cuadrillaId],
  );

  useEffect(() => {
    if (canal === 'coordinadores' && usuario?.rol !== 'coordinador') {
      setCanal('broadcast');
      setSearchParams({ canal: 'broadcast' }, { replace: true });
    }
  }, [canal, setSearchParams, usuario?.rol]);

  useEffect(() => {
    if (canal === 'jefes' && !['coordinador', 'jefe_cuadrilla'].includes(usuario?.rol)) {
      setCanal('broadcast');
      setSearchParams({ canal: 'broadcast' }, { replace: true });
    }
  }, [canal, setSearchParams, usuario?.rol]);

  const quitarFoto = useCallback(() => {
    setFoto(null);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }, []);

  const limpiarAcciones = useCallback(() => {
    setEsEmergencia(false);
    setRegistrarHito(false);
    setHitoFinalizado(false);
    setPrioridadAlta(false);
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    async function cargarCuadrillas() {
      setCargandoCuadrillas(true);
      setErrorCuadrillas('');
      try {
        const datos = await obtenerCuadrillasAccesibles();
        if (montadoRef.current) setCuadrillas(datos || []);
      } catch (errorActual) {
        if (montadoRef.current) {
          setErrorCuadrillas(errorActual.message || 'No se pudieron cargar las cuadrillas.');
        }
      } finally {
        if (montadoRef.current) setCargandoCuadrillas(false);
      }
    }
    cargarCuadrillas();
    return () => {
      montadoRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (cargandoCuadrillas || canal !== 'cuadrilla') return;
    const disponible = cuadrillas.some((cuadrilla) => cuadrilla.id === Number(cuadrillaId));
    if (!disponible) {
      const siguienteId = cuadrillas[0] ? String(cuadrillas[0].id) : '';
      setCuadrillaId(siguienteId);
      setSearchParams(
        siguienteId ? { canal: 'cuadrilla', cuadrillaId: siguienteId } : { canal: 'cuadrilla' },
        { replace: true },
      );
    }
  }, [canal, cargandoCuadrillas, cuadrillaId, cuadrillas, setSearchParams]);

  useEffect(() => {
    if (canal !== 'cuadrilla' || !cuadrillaId) {
      setIntegrantes([]);
      setErrorIntegrantes('');
      setCargandoIntegrantes(false);
      return undefined;
    }

    let vigente = true;
    setIntegrantes([]);
    setErrorIntegrantes('');
    setCargandoIntegrantes(true);
    obtenerIntegrantesCuadrilla(cuadrillaId)
      .then((datos) => {
        if (vigente) setIntegrantes(datos || []);
      })
      .catch((errorActual) => {
        if (vigente) setErrorIntegrantes(errorActual.message || 'No se pudieron cargar los integrantes.');
      })
      .finally(() => {
        if (vigente) setCargandoIntegrantes(false);
      });

    return () => {
      vigente = false;
    };
  }, [canal, cuadrillaId]);

  const cargarMensajes = useCallback(async (esAutomatico = false) => {
    if (canal === 'cuadrilla' && cargandoCuadrillas) return;
    if (canal === 'cuadrilla' && !cuadrillaId) {
      setMensajes([]);
      return;
    }
    if (!esAutomatico) {
      setCargandoMensajes(true);
      setError('');
    }
    try {
      const datos = canal === 'broadcast'
        ? await obtenerBroadcast()
        : canal === 'coordinadores'
          ? await obtenerChatCoordinadores()
          : canal === 'jefes'
            ? await obtenerChatJefes()
          : await obtenerMensajesCuadrilla(cuadrillaId);
      if (!montadoRef.current) return;
      setMensajes(datos || []);
      setErrorAutoRefresh('');
    } catch (errorActual) {
      if (!montadoRef.current) return;
      const texto = errorActual.message || 'No se pudieron cargar los mensajes.';
      if (esAutomatico) setErrorAutoRefresh(texto);
      else setError(texto);
    } finally {
      if (!esAutomatico && montadoRef.current) setCargandoMensajes(false);
    }
  }, [canal, cargandoCuadrillas, cuadrillaId]);

  useEffect(() => {
    mantenerAlFinalRef.current = true;
    setMensajes([]);
    cargarMensajes();
  }, [cargarMensajes]);

  useEffect(() => {
    if (canal === 'cuadrilla' && !cuadrillaId) return undefined;
    const intervalo = window.setInterval(() => cargarMensajes(true), INTERVALO_POLLING);
    return () => window.clearInterval(intervalo);
  }, [canal, cuadrillaId, cargarMensajes]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = conectarChatTiempoReal(token);
    const recibirMensaje = (mensajeNuevo) => {
      const perteneceCanal = canal === 'cuadrilla'
        ? Number(mensajeNuevo.cuadrilla_id) === Number(cuadrillaId)
        : canal === 'coordinadores'
          ? mensajeNuevo.tipo === 'coordinadores'
          : canal === 'jefes'
            ? mensajeNuevo.tipo === 'jefes'
            : !mensajeNuevo.cuadrilla_id
              && !['coordinadores', 'jefes'].includes(mensajeNuevo.tipo);

      if (perteneceCanal) {
        mantenerAlFinalRef.current = true;
        agregarMensajeSinDuplicar(mensajeNuevo);
      }
    };
    socket.on('chat:mensaje', recibirMensaje);
    return () => {
      socket.off('chat:mensaje', recibirMensaje);
      socket.disconnect();
    };
  }, [agregarMensajeSinDuplicar, canal, cuadrillaId, token]);

  useEffect(() => {
    if (!mantenerAlFinalRef.current || !listaMensajesRef.current) return;
    window.requestAnimationFrame(() => {
      if (listaMensajesRef.current) {
        listaMensajesRef.current.scrollTop = listaMensajesRef.current.scrollHeight;
      }
    });
  }, [mensajes]);

  useEffect(() => {
    if (!foto) {
      setVistaPreviaFoto('');
      return undefined;
    }
    const url = URL.createObjectURL(foto);
    setVistaPreviaFoto(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const seleccionarBroadcast = () => {
    setCanal('broadcast');
    setCuadrillaId('');
    setSidebarAbierto(false);
    limpiarAcciones();
    quitarFoto();
    setSearchParams({ canal: 'broadcast' });
  };

  const seleccionarCoordinadores = () => {
    setCanal('coordinadores');
    setCuadrillaId('');
    setSidebarAbierto(false);
    limpiarAcciones();
    quitarFoto();
    setSearchParams({ canal: 'coordinadores' });
  };

  const seleccionarJefes = () => {
    setCanal('jefes');
    setCuadrillaId('');
    setSidebarAbierto(false);
    limpiarAcciones();
    quitarFoto();
    setSearchParams({ canal: 'jefes' });
  };

  const seleccionarCuadrilla = (id) => {
    const nuevoId = String(id);
    setCanal('cuadrilla');
    setCuadrillaId(nuevoId);
    setSidebarAbierto(false);
    limpiarAcciones();
    quitarFoto();
    setSearchParams({ canal: 'cuadrilla', cuadrillaId: nuevoId });
  };

  const manejarSeleccionFoto = (evento) => {
    const archivo = evento.target.files?.[0];
    setError('');
    if (!archivo) return;
    if (!TIPOS_FOTO.includes(archivo.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WebP.');
      evento.target.value = '';
      return;
    }
    if (archivo.size > MAX_FOTO_BYTES) {
      setError('La foto no puede superar los 5 MB.');
      evento.target.value = '';
      return;
    }
    setFoto(archivo);
    setEsEmergencia(false);
    setPrioridadAlta(false);
  };

  const manejarAccion = (accion) => {
    setError('');
    if (accion === 'avance') {
      setRegistrarHito(true);
      setHitoFinalizado(false);
      setEsEmergencia(false);
      setPrioridadAlta(false);
    } else if (accion === 'finalizado') {
      setRegistrarHito(true);
      setHitoFinalizado(true);
      setEsEmergencia(false);
      setPrioridadAlta(false);
    } else if (accion === 'emergencia') {
      setRegistrarHito(false);
      setHitoFinalizado(false);
      setEsEmergencia(true);
      setPrioridadAlta(true);
      quitarFoto();
    } else {
      limpiarAcciones();
    }
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    setError('');
    const texto = contenido.trim();
    if (!texto && !registrarHito && !foto) {
      setError(esEmergencia ? 'Describe la emergencia antes de enviarla.' : 'Escribe un mensaje o adjunta una foto.');
      return;
    }
    if (canal === 'cuadrilla' && !cuadrillaId) {
      setError('Selecciona una cuadrilla.');
      return;
    }

    setEnviando(true);
    try {
      let mensajeNuevo;
      if (foto) {
        if (['broadcast', 'coordinadores', 'jefes'].includes(canal)) {
          mensajeNuevo = await enviarFotoCanalCoordinador(canal, foto, texto);
        } else {
          const tipoHito = registrarHito ? (hitoFinalizado ? 'finalizado' : 'avance') : null;
          mensajeNuevo = await enviarFotoAvance(Number(cuadrillaId), foto, texto, tipoHito);
        }
      } else if (usuario?.rol === 'jefe_cuadrilla' && registrarHito) {
        mensajeNuevo = await marcarAvance(
          Number(cuadrillaId),
          hitoFinalizado ? 'finalizado' : 'avance',
          texto || 'Hito registrado',
        );
      } else {
        const payload = {
          contenido: texto,
          tipo: 'texto',
          prioridad: prioridadAlta || esEmergencia,
          cuadrilla_id: canal === 'cuadrilla' ? Number(cuadrillaId) : null,
        };
        mensajeNuevo = canal === 'coordinadores'
          ? await enviarMensajeCoordinadores(texto, prioridadAlta)
          : canal === 'jefes'
            ? await enviarMensajeJefes(texto)
          : esEmergencia && usuario?.rol === 'jefe_cuadrilla'
          ? await enviarEmergencia({ ...payload, tipo: 'emergencia', prioridad: true })
          : await enviarMensaje(payload);
      }
      if (!montadoRef.current) return;
      mantenerAlFinalRef.current = true;
      agregarMensajeSinDuplicar(mensajeNuevo);
      setContenido('');
      quitarFoto();
      limpiarAcciones();
    } catch (errorActual) {
      if (montadoRef.current) setError(errorActual.message || 'No se pudo enviar el mensaje.');
    } finally {
      if (montadoRef.current) setEnviando(false);
    }
  };

  const manejarScroll = () => {
    const lista = listaMensajesRef.current;
    if (!lista) return;
    mantenerAlFinalRef.current = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 140;
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100">
      <div className="flex h-full">
        <SidebarComunicaciones
          abierto={sidebarAbierto}
          usuario={usuario}
          canal={canal}
          cuadrillaId={cuadrillaId}
          cuadrillas={cuadrillas}
          cargandoCuadrillas={cargandoCuadrillas}
          onCerrar={() => setSidebarAbierto(false)}
          onSeleccionarBroadcast={seleccionarBroadcast}
          onSeleccionarCoordinadores={seleccionarCoordinadores}
          onSeleccionarJefes={seleccionarJefes}
          onSeleccionarCuadrilla={seleccionarCuadrilla}
        />

        <main className="flex min-w-0 flex-1 flex-col bg-white">
          <EncabezadoCanal
            canal={canal}
            cuadrilla={cuadrillaSeleccionada}
            onAbrirCanales={() => setSidebarAbierto(true)}
            onAbrirInformacion={() => setPanelAbierto(true)}
          />

          {(errorCuadrillas || errorAutoRefresh) && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              {errorCuadrillas || `No se pudo actualizar automáticamente: ${errorAutoRefresh}`}
            </div>
          )}

          <ListaMensajes
            ref={listaMensajesRef}
            mensajes={mensajes}
            usuario={usuario}
            canal={canal}
            formatoFecha={FORMATO_FECHA}
            resolverArchivo={obtenerUrlArchivo}
            onAbrirImagen={setImagenModal}
            onScroll={manejarScroll}
            cargando={cargandoMensajes}
          />

          {error && (
            <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <CompositorMensaje
            usuario={usuario}
            canal={canal}
            contenido={contenido}
            onContenido={setContenido}
            onEnviar={manejarEnvio}
            cargando={enviando || (canal === 'cuadrilla' && !cuadrillaSeleccionada)}
            prioridadAlta={prioridadAlta}
            onPrioridad={setPrioridadAlta}
            esEmergencia={esEmergencia}
            registrarHito={registrarHito}
            hitoFinalizado={hitoFinalizado}
            onAccion={manejarAccion}
            foto={foto}
            vistaPreviaFoto={vistaPreviaFoto}
            inputFotoRef={inputFotoRef}
            onSeleccionFoto={manejarSeleccionFoto}
            onQuitarFoto={quitarFoto}
          />
        </main>

        <PanelCuadrilla
          abierto={panelAbierto}
          canal={canal}
          cuadrilla={cuadrillaSeleccionada}
          usuario={usuario}
          integrantes={integrantes}
          cargandoIntegrantes={cargandoIntegrantes}
          errorIntegrantes={errorIntegrantes}
          onCerrar={() => setPanelAbierto(false)}
        />
      </div>
      <ModalImagen imagen={imagenModal} onCerrar={() => setImagenModal(null)} />
    </div>
  );
}

export default Comunicaciones;
