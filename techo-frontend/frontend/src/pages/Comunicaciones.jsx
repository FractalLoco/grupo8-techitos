import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import {
  obtenerBroadcast,
  obtenerCuadrillasAccesibles,
  obtenerMensajesCuadrilla,
  enviarMensaje,
  enviarEmergencia,
  enviarFotoAvance,
  marcarAvance,
  obtenerUrlArchivo,
} from '../services/comunicacionesService';

const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const INTERVALO_AUTO_REFRESH = 5000;

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function Comunicaciones() {
  const { usuario } = useAutenticacion();
  const [canal, setCanal] = useState('broadcast');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [cuadrillaId, setCuadrillaId] = useState('');
  const [cargandoCuadrillas, setCargandoCuadrillas] = useState(true);
  const [prioridadAlta, setPrioridadAlta] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [contenido, setContenido] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [errorAutoRefresh, setErrorAutoRefresh] = useState('');
  const [esEmergencia, setEsEmergencia] = useState(false);
  const [registrarHito, setRegistrarHito] = useState(false);
  const [hitoFinalizado, setHitoFinalizado] = useState(false);
  const [foto, setFoto] = useState(null);
  const [vistaPreviaFoto, setVistaPreviaFoto] = useState('');
  const inputFotoRef = useRef(null);
  const intervaloRef = useRef(null);
  const montadoRef = useRef(true);

  const cuadrillaSeleccionada = useMemo(
    () => cuadrillas.find((c) => c.id === Number(cuadrillaId)),
    [cuadrillas, cuadrillaId],
  );

  const tituloCanal = useMemo(() => {
    if (canal === 'broadcast') return 'Anuncios generales';
    if (cuadrillaSeleccionada) return `Chat ${cuadrillaSeleccionada.nombre}`;
    return 'Chat de cuadrilla';
  }, [canal, cuadrillaSeleccionada]);

  // Carga la lista de cuadrillas accesibles
  const cargarCuadrillas = useCallback(async () => {
    try {
      setCargandoCuadrillas(true);
      const datos = await obtenerCuadrillasAccesibles();
      if (!montadoRef.current) return;
      setCuadrillas(datos || []);
    } catch {
      // Error silencioso, se mantiene la lista anterior
    } finally {
      if (montadoRef.current) {
        setCargandoCuadrillas(false);
      }
    }
  }, []);

  // Carga los mensajes del canal activo
  const cargarMensajes = useCallback(async (esAutoRefresh = false) => {
    if (esAutoRefresh) {
      setErrorAutoRefresh('');
    } else {
      setError('');
    }

    try {
      if (canal === 'broadcast') {
        const datos = await obtenerBroadcast();
        if (montadoRef.current) setMensajes(datos || []);
        return;
      }

      if (!cuadrillaId) {
        if (montadoRef.current) setMensajes([]);
        return;
      }

      const datos = await obtenerMensajesCuadrilla(cuadrillaId);
      if (montadoRef.current) setMensajes(datos || []);
    } catch (errorActual) {
      if (!montadoRef.current) return;
      if (esAutoRefresh) {
        setErrorAutoRefresh(errorActual.message || 'Error al actualizar mensajes');
      } else {
        setError(errorActual.message || 'No se pudieron cargar los mensajes');
      }
    }
  }, [canal, cuadrillaId]);

  // Cargar cuadrillas al montar el componente
  useEffect(() => {
    montadoRef.current = true;
    cargarCuadrillas();
    return () => {
      montadoRef.current = false;
    };
  }, [cargarCuadrillas]);

  // Cuando cambia el canal, cargar mensajes y ajustar selector
  useEffect(() => {
    if (canal === 'broadcast') {
      setCuadrillaId('');
      cargarMensajes();
    }
  }, [canal, cargarMensajes]);

  // Auto-seleccionar la primera cuadrilla al entrar en modo cuadrilla
  useEffect(() => {
    if (canal !== 'cuadrilla') return;

    if (cuadrillas.length > 0) {
      const sigueDisponible = cuadrillas.some((c) => c.id === Number(cuadrillaId));
      if (cuadrillaId && sigueDisponible) {
        // La selección actual sigue disponible; solo cargar mensajes
        cargarMensajes();
      } else {
        // Seleccionar la primera disponible
        const primera = cuadrillas[0];
        setCuadrillaId(String(primera.id));
      }
    } else {
      setCuadrillaId('');
      setMensajes([]);
    }
  }, [canal, cuadrillas, cuadrillaId, cargarMensajes]);

  // Cuando cuadrillaId cambia (por selector o auto-selección), cargar mensajes
  useEffect(() => {
    if (canal === 'cuadrilla' && cuadrillaId) {
      cargarMensajes();
    }
  }, [cuadrillaId]); 

  // Si la cuadrilla seleccionada deja de estar disponible, elegir otra
  useEffect(() => {
    if (canal !== 'cuadrilla' || !cuadrillaId || cargandoCuadrillas) return;
    const sigueDisponible = cuadrillas.some((c) => c.id === Number(cuadrillaId));
    if (!sigueDisponible) {
      if (cuadrillas.length > 0) {
        setCuadrillaId(String(cuadrillas[0].id));
      } else {
        setCuadrillaId('');
        setMensajes([]);
      }
    }
  }, [cuadrillas, cuadrillaId, canal, cargandoCuadrillas]);

  // Intervalo de auto-refresh cada 5 segundos
  useEffect(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }

    if (!canal || (canal === 'cuadrilla' && !cuadrillaId)) return;

    intervaloRef.current = setInterval(() => {
      cargarMensajes(true);
    }, INTERVALO_AUTO_REFRESH);

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
    };
  }, [canal, cuadrillaId, cargarMensajes]);

  useEffect(() => {
    if (!foto) {
      setVistaPreviaFoto('');
      return undefined;
    }

    const url = URL.createObjectURL(foto);
    setVistaPreviaFoto(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const quitarFoto = () => {
    setFoto(null);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  };

  const manejarSeleccionFoto = (evento) => {
    const archivo = evento.target.files?.[0];
    setError('');
    if (!archivo) return;
    if (!TIPOS_FOTO_PERMITIDOS.includes(archivo.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WebP');
      evento.target.value = '';
      return;
    }
    if (archivo.size > MAX_FOTO_BYTES) {
      setError('La foto no puede superar los 5 MB');
      evento.target.value = '';
      return;
    }

    setFoto(archivo);
    setEsEmergencia(false);
    setPrioridadAlta(false);
  };

  const manejarCambioCuadrilla = (evento) => {
    setCuadrillaId(evento.target.value);
  };

  const manejarEnvio = async (evento) => {
    evento.preventDefault();
    setError('');

    if (!contenido.trim() && !registrarHito && !foto) {
      setError('Escribe un mensaje antes de enviar');
      return;
    }

    if (canal === 'cuadrilla' && !cuadrillaId) {
      setError('Selecciona una cuadrilla');
      return;
    }

    setCargando(true);

    try {
      if (foto) {
        const tipoHito = registrarHito ? (hitoFinalizado ? 'finalizado' : 'avance') : null;
        const mensajeNuevo = await enviarFotoAvance(Number(cuadrillaId), foto, contenido, tipoHito);
        setMensajes((previo) => [...previo, mensajeNuevo]);
        setContenido('');
        quitarFoto();
        setRegistrarHito(false);
        setHitoFinalizado(false);
        setPrioridadAlta(false);
        return;
      }

      if (usuario?.rol === 'jefe_cuadrilla' && registrarHito) {
        const mensajeNuevo = await marcarAvance(
          Number(cuadrillaId),
          hitoFinalizado ? 'finalizado' : 'avance',
          contenido.trim() || 'Hito registrado',
        );
        setMensajes((previo) => [...previo, mensajeNuevo]);
        setContenido('');
        setEsEmergencia(false);
        setRegistrarHito(false);
        setHitoFinalizado(false);
        return;
      }

      const payload = {
        contenido: contenido.trim(),
        tipo: 'texto',
        prioridad: prioridadAlta || esEmergencia,
        cuadrilla_id: canal === 'cuadrilla' ? Number(cuadrillaId) : null,
      };

      const mensajeNuevo = esEmergencia && usuario?.rol === 'jefe_cuadrilla'
        ? await enviarEmergencia({
            cuadrilla_id: canal === 'cuadrilla' ? Number(cuadrillaId) : null,
            contenido: contenido.trim(),
            tipo: 'emergencia',
            prioridad: true,
          })
        : await enviarMensaje(payload);

      setMensajes((previo) => [...previo, mensajeNuevo]);
      setContenido('');
      setPrioridadAlta(false);
      setEsEmergencia(false);
      setRegistrarHito(false);
      setHitoFinalizado(false);
    } catch (errorActual) {
      setError(errorActual.message || 'No se pudo enviar el mensaje');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen chat-shell overflow-hidden">
      <Navbar />
      <div className="pt-20 px-6 pb-6 h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto animate-fadeIn h-full flex flex-col min-h-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-techo-secondary/70">
                Comunicaciones
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold text-techo-primary">
                {tituloCanal}
              </h1>
              <p className="text-sm text-slate-500 mt-2 max-w-xl">
                Mantente al dia con anuncios, coordinaciones de cuadrillas y actualizaciones en terreno.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  canal === 'broadcast'
                    ? 'bg-techo-primary text-white border-techo-primary'
                    : 'bg-white/70 text-techo-primary border-white/60 hover:bg-white'
                }`}
                onClick={() => {
                  setCanal('broadcast');
                  quitarFoto();
                }}
              >
                Broadcast
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  canal === 'cuadrilla'
                    ? 'bg-techo-primary text-white border-techo-primary'
                    : 'bg-white/70 text-techo-primary border-white/60 hover:bg-white'
                }`}
                onClick={() => setCanal('cuadrilla')}
              >
                Cuadrilla
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 flex-1 min-h-0">
            <section className="chat-card rounded-2xl p-6 shadow-xl border border-white/50 flex flex-col min-h-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div>
                  <p className="text-sm font-semibold text-techo-primary">Canal activo</p>
                  <p className="text-xs text-slate-500">
                    {canal === 'broadcast'
                      ? 'Mensajes generales para toda la operacion'
                      : 'Mensajes internos por cuadrilla'}
                  </p>
                </div>

                {canal === 'cuadrilla' && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-500" htmlFor="selector-cuadrilla">
                      Cuadrilla
                    </label>
                    <select
                      id="selector-cuadrilla"
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-techo-secondary/30 focus:border-techo-secondary outline-none bg-white min-w-[180px]"
                      value={cuadrillaId}
                      onChange={manejarCambioCuadrilla}
                      disabled={cargandoCuadrillas}
                    >
                      {cargandoCuadrillas ? (
                        <option value="">Cargando cuadrillas...</option>
                      ) : cuadrillas.length === 0 ? (
                        <option value="">No hay cuadrillas disponibles</option>
                      ) : (
                        <>
                          <option value="">Selecciona una cuadrilla</option>
                          {cuadrillas.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-600 px-4 py-2 text-sm">
                  {error}
                </div>
              )}

              {errorAutoRefresh && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-4 py-2 text-xs">
                  {errorAutoRefresh}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4 mb-6">
                {mensajes.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-sm text-slate-400">No hay mensajes aun.</p>
                  </div>
                )}

                {mensajes.map((mensaje) => {
                  const esPropio = usuario && mensaje.remitente_id === usuario.id;
                  const esPrioritario = mensaje.prioridad === true || mensaje.tipo === 'emergencia';
                  return (
                    <div
                      key={mensaje.id || `${mensaje.remitente_id}-${mensaje.creado_en}-${mensaje.contenido}`}
                      className={`flex ${esPropio ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm border ${
                          esPropio
                            ? 'bg-techo-primary text-white border-techo-primary/80'
                            : 'bg-white text-slate-700 border-slate-200'
                        } ${esPrioritario ? 'ring-2 ring-techo-accent/40' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${esPropio ? 'text-white/80' : 'text-slate-400'}`}>
                            {esPropio ? 'Tu' : (mensaje.remitente_nombre || `ID ${mensaje.remitente_id || 'anon'}`)}
                          </span>
                          {mensaje.tipo && (
                            <span
                              className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                mensaje.tipo === 'emergencia'
                                  ? 'bg-techo-danger/15 text-techo-danger'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {mensaje.tipo}
                            </span>
                          )}
                          {esPrioritario && (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-techo-accent/15 text-techo-accent">
                              Prioridad
                            </span>
                          )}
                        </div>
                        {mensaje.archivo_url && (
                          <a
                            href={obtenerUrlArchivo(mensaje.archivo_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="block mt-2"
                            aria-label="Abrir foto de avance en tamano completo"
                          >
                            <img
                              src={obtenerUrlArchivo(mensaje.archivo_url)}
                              alt={mensaje.contenido || (mensaje.tipo === 'finalizado'
                                ? 'Foto de finalizacion de la obra'
                                : 'Foto de avance de la cuadrilla')}
                              className="max-h-80 w-full rounded-xl object-cover"
                              loading="lazy"
                            />
                          </a>
                        )}
                        {mensaje.contenido && (
                          <p className={`text-sm leading-relaxed ${mensaje.archivo_url ? 'mt-2' : ''}`}>
                            {mensaje.contenido}
                          </p>
                        )}
                        {!mensaje.contenido && !mensaje.archivo_url && (
                          <p className="text-sm leading-relaxed">Mensaje sin contenido</p>
                        )}
                        <p className={`text-[11px] mt-2 ${esPropio ? 'text-white/70' : 'text-slate-400'}`}>
                          {mensaje.creado_en
                            ? FORMATO_FECHA.format(new Date(mensaje.creado_en))
                            : 'Reciente'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={manejarEnvio} className="space-y-3">
                {usuario?.rol === 'jefe_cuadrilla' && canal === 'cuadrilla' && (
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-techo-primary hover:bg-slate-200">
                        Adjuntar foto
                        <input
                          ref={inputFotoRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          className="sr-only"
                          onChange={manejarSeleccionFoto}
                          disabled={cargando}
                        />
                      </label>
                      <span className="text-[11px] text-slate-500">JPG, PNG o WebP, maximo 5 MB</span>
                    </div>

                    {foto && (
                      <div className="mt-3 flex items-center gap-3">
                        <img
                          src={vistaPreviaFoto}
                          alt="Vista previa de la foto seleccionada"
                          className="h-20 w-24 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-700">{foto.name}</p>
                          <p className="text-[11px] text-slate-500">{(foto.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={quitarFoto}
                          disabled={cargando}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <input
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-techo-secondary/30 focus:border-techo-secondary outline-none text-sm"
                    placeholder="Escribe un mensaje para el equipo..."
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-techo-secondary text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                    disabled={cargando}
                  >
                    {cargando
                      ? 'Enviando...'
                      : foto && registrarHito
                        ? (hitoFinalizado ? 'Finalizar con foto' : 'Registrar hito con foto')
                        : foto
                          ? 'Enviar foto'
                          : registrarHito
                            ? (hitoFinalizado ? 'Finalizar obra' : 'Registrar hito')
                            : 'Enviar mensaje'}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={prioridadAlta}
                    onChange={(e) => setPrioridadAlta(e.target.checked)}
                    disabled={Boolean(foto)}
                  />
                  Marcar como prioridad alta
                </label>

                {usuario?.rol === 'jefe_cuadrilla' && canal === 'cuadrilla' && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 space-y-3">
                    <p className="text-xs font-semibold text-techo-primary">Opciones rápidas</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={esEmergencia}
                          onChange={(e) => {
                            setEsEmergencia(e.target.checked);
                            if (e.target.checked) {
                              quitarFoto();
                              setRegistrarHito(false);
                              setHitoFinalizado(false);
                            }
                          }}
                        />
                        Emergencia
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={registrarHito}
                          onChange={(e) => {
                            setRegistrarHito(e.target.checked);
                            if (e.target.checked) {
                              setEsEmergencia(false);
                              setPrioridadAlta(false);
                            }
                          }}
                        />
                        Registrar hito
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-500">
                        <input
                          type="checkbox"
                          checked={hitoFinalizado}
                          onChange={(e) => setHitoFinalizado(e.target.checked)}
                          disabled={!registrarHito}
                        />
                        Finalizado
                      </label>
                    </div>
                  </div>
                )}
              </form>
            </section>

            <aside className="space-y-6 overflow-y-auto pr-1 lg:max-h-full">
              <div className="chat-card rounded-2xl p-5 shadow-lg border border-white/50">
                <h2 className="text-sm font-semibold text-techo-primary mb-3">Estado del canal</h2>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Usuario activo</span>
                    <span className="font-semibold text-slate-700">{usuario?.nombre || 'Invitado'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rol</span>
                    <span className="font-semibold text-slate-700">{usuario?.rol || 'Sin rol'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Prioridad</span>
                    <span className={`font-semibold ${prioridadAlta ? 'text-techo-accent' : 'text-slate-400'}`}>
                      {prioridadAlta ? 'Alta' : 'Normal'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="chat-card rounded-2xl p-5 shadow-lg border border-white/50">
                <h2 className="text-sm font-semibold text-techo-primary mb-3">Atajos operativos</h2>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-techo-secondary"></span>
                    Coordina con los jefes antes de iniciar una cuadrilla nueva.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-techo-accent"></span>
                    Marca prioridad solo cuando requiera atencion inmediata.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-techo-primary"></span>
                    Usa Broadcast para anuncios generales y Cuadrilla para temas internos.
                  </li>
                </ul>
              </div>

            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Comunicaciones;
