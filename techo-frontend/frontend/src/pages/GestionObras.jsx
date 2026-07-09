import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MdAdd,
  MdAssignment,
  MdCheckCircle,
  MdClose,
  MdConstruction,
  MdGroups,
  MdLocationOn,
  MdRefresh,
  MdSearch,
  MdWarning,
} from 'react-icons/md';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Toast from '../components/ui/Toast';
import { obtenerEmergencias, obtenerFamilias } from '../services/emergenciaService';
import { listarCuadrillasConEstado, asignarObra } from '../services/cuadrillaService';
import { crearObra, listarObrasPorEmergencia } from '../services/obraService';
import { buscarDireccionesMultiples } from '../services/mapaService';

const POR_PAGINA = 6;

const ESTADOS = {
  disponible: { label: 'Disponible', color: 'blue' },
  asignada: { label: 'Asignada', color: 'warning' },
  completada: { label: 'Completada', color: 'success' },
};

function normalizarLista(respuesta, clave) {
  const lista = respuesta?.datos?.[clave] ?? respuesta?.datos ?? [];
  return Array.isArray(lista) ? lista : [];
}

function coordenadaOpcional(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function ubicacionPreferida(familia, emergencia) {
  const latFamilia = coordenadaOpcional(familia?.lat);
  const lngFamilia = coordenadaOpcional(familia?.lng);
  const familiaTieneCoordenadas = latFamilia !== null && lngFamilia !== null;

  if (familiaTieneCoordenadas) {
    return {
      direccion: familia?.direccion || emergencia?.direccion || '',
      lat: latFamilia,
      lng: lngFamilia,
    };
  }

  return {
    direccion: familia?.direccion || emergencia?.direccion || '',
    lat: coordenadaOpcional(emergencia?.lat),
    lng: coordenadaOpcional(emergencia?.lng),
  };
}

function formularioPorDefecto(emergencia, familias = []) {
  const familia = familias[0] || null;
  const ubicacion = ubicacionPreferida(familia, emergencia);

  return {
    nombre: familia
      ? `Atención familia ${familia.nombre_cabeza_familia}`
      : emergencia?.nombre
        ? `Obra ${emergencia.nombre}`
        : '',
    descripcion: emergencia?.descripcion || '',
    direccion: ubicacion.direccion,
    lat: ubicacion.lat,
    lng: ubicacion.lng,
    familia_id: familia ? String(familia.id) : '',
  };
}

export default function GestionObras() {
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [obras, setObras] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [asignandoObraId, setAsignandoObraId] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [mensajeError, setMensajeError] = useState('');

  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formObra, setFormObra] = useState({
    nombre: '',
    descripcion: '',
    direccion: '',
    lat: null,
    lng: null,
    familia_id: '',
  });
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [resultadosDireccion, setResultadosDireccion] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [seleccionCuadrilla, setSeleccionCuadrilla] = useState({});

  const emergenciaSeleccionada = useMemo(
    () => emergencias.find((e) => String(e.id) === String(emergenciaId)) || null,
    [emergencias, emergenciaId],
  );

  const mostrarExito = useCallback((titulo, descripcion) => {
    setMensajeExito({ titulo, descripcion });
    window.setTimeout(() => setMensajeExito(null), 4500);
  }, []);

  useEffect(() => {
    if (!mensajeError) return undefined;
    const timer = window.setTimeout(() => setMensajeError(''), 4500);
    return () => window.clearTimeout(timer);
  }, [mensajeError]);

  useEffect(() => {
    let activo = true;
    obtenerEmergencias()
      .then((respuesta) => {
        if (!activo) return;
        const lista = normalizarLista(respuesta, 'emergencias').filter((e) => e.estado === 'activa');
        setEmergencias(lista);
        if (lista.length > 0) setEmergenciaId(String(lista[0].id));
      })
      .catch((error) => {
        if (activo) setMensajeError(error.response?.data?.mensaje || 'No se pudieron cargar las emergencias activas');
      });
    return () => { activo = false; };
  }, []);

  const cargarDatos = useCallback(async ({ manual = false, reiniciarFormulario = false } = {}) => {
    if (!emergenciaId) {
      setObras([]);
      setCuadrillas([]);
      setFamilias([]);
      setFormObra(formularioPorDefecto(null, []));
      return;
    }

    if (manual) setActualizando(true);
    else setCargando(true);
    setMensajeError('');

    try {
      const [respuestaObras, respuestaCuadrillas, respuestaFamilias] = await Promise.all([
        listarObrasPorEmergencia(emergenciaId),
        listarCuadrillasConEstado(emergenciaId),
        obtenerFamilias(emergenciaId),
      ]);
      const listaFamilias = normalizarLista(respuestaFamilias, 'familias');
      setObras(normalizarLista(respuestaObras, 'obras'));
      setCuadrillas(normalizarLista(respuestaCuadrillas, 'cuadrillas'));
      setFamilias(listaFamilias);

      if (reiniciarFormulario) {
        setFormObra(formularioPorDefecto(emergenciaSeleccionada, listaFamilias));
        setResultadosDireccion([]);
      }

      if (manual) {
        setPagina(1);
        mostrarExito('¡Obras actualizadas!', 'La información de obras, familias y cuadrillas se sincronizó correctamente.');
      }
    } catch (error) {
      setMensajeError(error.response?.data?.mensaje || error.message || 'No se pudieron cargar los datos de obras');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [emergenciaId, emergenciaSeleccionada, mostrarExito]);

  useEffect(() => {
    cargarDatos({ reiniciarFormulario: true });
    setPagina(1);
    setSeleccionCuadrilla({});
  }, [emergenciaId]);

  useEffect(() => {
    const texto = formObra.direccion.trim();
    if (!mostrarCrear || texto.length < 3 || (formObra.lat !== null && formObra.lng !== null)) {
      setResultadosDireccion([]);
      setBuscandoDireccion(false);
      return undefined;
    }

    let cancelado = false;
    const timer = window.setTimeout(async () => {
      setBuscandoDireccion(true);
      try {
        const resultados = await buscarDireccionesMultiples(texto);
        if (!cancelado) setResultadosDireccion(resultados);
      } catch {
        if (!cancelado) setResultadosDireccion([]);
      } finally {
        if (!cancelado) setBuscandoDireccion(false);
      }
    }, 400);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [formObra.direccion, formObra.lat, formObra.lng, mostrarCrear]);

  const cuadrillaPorObra = useMemo(() => {
    const mapa = new Map();
    cuadrillas.forEach((cuadrilla) => {
      if (cuadrilla.obra_asignada_id) mapa.set(Number(cuadrilla.obra_asignada_id), cuadrilla);
    });
    return mapa;
  }, [cuadrillas]);

  const cuadrillasElegibles = useMemo(
    () => cuadrillas.filter((c) =>
      ['activa', 'en_progreso'].includes(c.estado)
      && !c.obra_asignada_id
      && Number(c.miembrosCount ?? 0) >= 10
    ),
    [cuadrillas],
  );

  const stats = useMemo(() => ({
    total: obras.length,
    disponibles: obras.filter((o) => !cuadrillaPorObra.has(Number(o.id)) && o.estado === 'disponible').length,
    asignadas: obras.filter((o) => cuadrillaPorObra.has(Number(o.id)) || o.estado === 'asignada').length,
    completadas: obras.filter((o) => o.estado === 'completada').length,
  }), [obras, cuadrillaPorObra]);

  const obrasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return obras.filter((obra) => {
      const cuadrilla = cuadrillaPorObra.get(Number(obra.id));
      const estadoReal = obra.estado === 'completada' ? 'completada' : cuadrilla ? 'asignada' : obra.estado;
      if (filtroEstado && estadoReal !== filtroEstado) return false;
      if (!texto) return true;
      return [obra.nombre, obra.descripcion, obra.direccion, obra.familia?.nombre_cabeza_familia, cuadrilla?.nombre]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(texto));
    });
  }, [obras, busqueda, filtroEstado, cuadrillaPorObra]);

  const totalPaginas = Math.max(1, Math.ceil(obrasFiltradas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const obrasPagina = obrasFiltradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroEstado]);

  const seleccionarDireccion = (resultado) => {
    setFormObra((prev) => ({
      ...prev,
      direccion: resultado.etiqueta,
      lat: resultado.lat,
      lng: resultado.lng,
    }));
    setResultadosDireccion([]);
  };

  const cambiarDireccion = (valor) => {
    setFormObra((prev) => ({ ...prev, direccion: valor, lat: null, lng: null }));
  };

  const seleccionarFamilia = (familiaId) => {
    const familia = familias.find((item) => String(item.id) === String(familiaId)) || null;
    const ubicacion = ubicacionPreferida(familia, emergenciaSeleccionada);

    setFormObra((prev) => ({
      ...prev,
      familia_id: familia ? String(familia.id) : '',
      nombre: familia
        ? `Atención familia ${familia.nombre_cabeza_familia}`
        : emergenciaSeleccionada?.nombre
          ? `Obra ${emergenciaSeleccionada.nombre}`
          : prev.nombre,
      direccion: ubicacion.direccion,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
    }));
    setResultadosDireccion([]);
  };

  const limpiarFormulario = () => {
    setFormObra(formularioPorDefecto(emergenciaSeleccionada, familias));
    setResultadosDireccion([]);
  };

  const handleCrearObra = async (evento) => {
    evento.preventDefault();
    if (!emergenciaId) return setMensajeError('Selecciona una emergencia activa');
    if (!formObra.nombre.trim()) return setMensajeError('El nombre de la obra es obligatorio');
    if (formObra.lat === null || formObra.lng === null) {
      return setMensajeError('Selecciona una dirección de la lista de sugerencias');
    }

    setGuardando(true);
    setMensajeError('');
    try {
      await crearObra({
        nombre: formObra.nombre.trim(),
        descripcion: formObra.descripcion.trim() || null,
        direccion: formObra.direccion,
        lat: formObra.lat,
        lng: formObra.lng,
        emergencia_id: Number(emergenciaId),
        familia_id: formObra.familia_id ? Number(formObra.familia_id) : null,
      });
      limpiarFormulario();
      setMostrarCrear(false);
      await cargarDatos();
      setPagina(1);
      mostrarExito('¡Obra creada!', 'La obra quedó disponible para asignarla a una cuadrilla.');
    } catch (error) {
      setMensajeError(error.response?.data?.mensaje || error.message || 'No se pudo crear la obra');
    } finally {
      setGuardando(false);
    }
  };

  const handleAsignar = async (obra) => {
    const cuadrillaId = seleccionCuadrilla[obra.id];
    if (!cuadrillaId) return setMensajeError('Selecciona una cuadrilla para esta obra');

    setAsignandoObraId(obra.id);
    setMensajeError('');
    try {
      await asignarObra(cuadrillaId, obra.id);
      setSeleccionCuadrilla((prev) => ({ ...prev, [obra.id]: '' }));
      await cargarDatos();
      const cuadrilla = cuadrillas.find((c) => String(c.id) === String(cuadrillaId));
      mostrarExito('¡Obra asignada!', `${obra.nombre} fue asignada a ${cuadrilla?.nombre || 'la cuadrilla seleccionada'}.`);
    } catch (error) {
      setMensajeError(error.response?.data?.mensaje || error.message || 'No se pudo asignar la obra');
      await cargarDatos();
    } finally {
      setAsignandoObraId(null);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {mensajeError && <Toast type="error" message={mensajeError} />}

      <div className="pt-[60px]">
        <div className="page-header">
          <div className="page-header-content">
            <MdConstruction className="page-header-icon" />
            <div className="min-w-0 flex-1">
              <h1 className="page-header-title">Gestión de Obras</h1>
              <p className="text-xs text-white/70">Crea obras y asígnalas a cuadrillas de la misma emergencia</p>
            </div>
            <select
              className="page-select"
              value={emergenciaId}
              onChange={(e) => setEmergenciaId(e.target.value)}
            >
              {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
              {emergencias.map((emergencia) => (
                <option key={emergencia.id} value={emergencia.id}>{emergencia.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
          <div className="flex min-h-20 items-center justify-center py-2 pointer-events-none select-none">
            <img
              src="/logo-techo-color-oficial.svg"
              alt="TECHO Chile"
              className="h-14 w-auto object-contain animate-techo-logo-energetic"
            />
          </div>

          {mensajeExito && (
            <div className="animate-audit-success-in flex items-center justify-between gap-4 rounded-xl border border-green-600/20 bg-green-50 p-4 shadow-sm" role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                <div className="flex rounded-full bg-green-600 p-1 text-white"><MdCheckCircle size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-green-700">{mensajeExito.titulo}</p>
                  <p className="text-xs text-green-700/80">{mensajeExito.descripcion}</p>
                </div>
              </div>
              <button type="button" onClick={() => setMensajeExito(null)} className="rounded-full p-1 text-green-700 hover:bg-green-600/10" aria-label="Cerrar mensaje">
                <MdClose size={20} />
              </button>
            </div>
          )}

          {emergenciaSeleccionada && (
            <section className="card p-4">
              <div className="grid gap-3 md:grid-cols-3 md:items-center">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-outline">Emergencia seleccionada</p>
                  <p className="mt-1 font-bold text-on-surface">{emergenciaSeleccionada.nombre}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-outline">Dirección base</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{emergenciaSeleccionada.direccion || 'Sin dirección registrada'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-outline">Familias registradas</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-on-surface">
                    <MdGroups className="text-primary" /> {familias.length}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Total obras', stats.total, 'text-primary'],
              ['Disponibles', stats.disponibles, 'text-[#006D37]'],
              ['Asignadas', stats.asignadas, 'text-[#835100]'],
              ['Completadas', stats.completadas, 'text-on-surface-variant'],
            ].map(([label, valor, color]) => (
              <Card key={label} className="p-4">
                <p className="stat-label">{label}</p>
                <p className={`stat-value ${color}`}>{valor}</p>
              </Card>
            ))}
          </section>

          <section className="card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  className="input-field pl-10"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar obra, dirección o cuadrilla..."
                />
              </div>
              <select className="input-field md:w-48" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="disponible">Disponibles</option>
                <option value="asignada">Asignadas</option>
                <option value="completada">Completadas</option>
              </select>
              <Button variant="secondary" type="button" onClick={() => cargarDatos({ manual: true })} disabled={actualizando || !emergenciaId}>
                <MdRefresh className={actualizando ? 'animate-spin' : ''} />
                {actualizando ? 'Actualizando...' : 'Actualizar'}
              </Button>
              <Button type="button" onClick={() => setMostrarCrear((valor) => !valor)} disabled={!emergenciaId}>
                {mostrarCrear ? <MdClose /> : <MdAdd />}
                {mostrarCrear ? 'Cerrar formulario' : 'Nueva obra'}
              </Button>
            </div>
          </section>

          {mostrarCrear && (
            <section className="card animate-fadeIn p-5">
              <div className="section-header">
                <span className="section-number">1</span>
                <div>
                  <h2 className="section-title">Registrar obra</h2>
                  <p className="text-xs text-outline">Emergencia: {emergenciaSeleccionada?.nombre || '—'}</p>
                </div>
              </div>
              <form onSubmit={handleCrearObra} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Nombre de la obra</label>
                  <input
                    required
                    maxLength={150}
                    className="input-field"
                    value={formObra.nombre}
                    onChange={(e) => setFormObra((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej.: Vivienda familia González"
                  />
                </div>

                <div>
                  <label className="label">Familia afectada</label>
                  <select
                    className="input-field"
                    value={formObra.familia_id}
                    onChange={(e) => seleccionarFamilia(e.target.value)}
                  >
                    <option value="">Sin familia específica</option>
                    {familias.map((familia) => (
                      <option key={familia.id} value={familia.id}>
                        {familia.nombre_cabeza_familia} · {familia.direccion || 'sin dirección'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-outline">
                    Al cambiar de familia se carga automáticamente su dirección. Si no tiene ubicación, se usa la de la emergencia.
                  </p>
                </div>

                <div className="relative md:col-span-2">
                  <label className="label">Dirección</label>
                  <div className="relative">
                    <MdLocationOn className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                    <input
                      required
                      className="input-field pl-10"
                      value={formObra.direccion}
                      onChange={(e) => cambiarDireccion(e.target.value)}
                      placeholder="Escribe y selecciona una dirección existente"
                      autoComplete="off"
                    />
                  </div>
                  {buscandoDireccion && <p className="mt-1 text-xs text-outline">Buscando direcciones...</p>}
                  {resultadosDireccion.length > 0 && (
                    <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-outline-variant bg-white shadow-xl">
                      {resultadosDireccion.map((resultado) => (
                        <button
                          type="button"
                          key={resultado.id}
                          onClick={() => seleccionarDireccion(resultado)}
                          className="flex w-full items-start gap-2 border-b border-outline-variant/40 px-3 py-3 text-left text-sm last:border-0 hover:bg-primary/5"
                        >
                          <MdLocationOn className="mt-0.5 flex-shrink-0 text-primary" />
                          <span>
                            <strong className="block text-on-surface">{resultado.principal}</strong>
                            <span className="text-xs text-on-surface-variant">{resultado.secundaria}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {formObra.lat !== null && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#006D37]"><MdCheckCircle /> Ubicación lista para crear la obra</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="label">Descripción</label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    className="input-field resize-y"
                    value={formObra.descripcion}
                    onChange={(e) => setFormObra((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Describe el trabajo requerido..."
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                  <Button variant="ghost" type="button" onClick={limpiarFormulario}>Restaurar datos</Button>
                  <Button type="submit" disabled={guardando}>
                    <MdAdd /> {guardando ? 'Guardando...' : 'Crear obra'}
                  </Button>
                </div>
              </form>
            </section>
          )}

          {!emergenciaId ? (
            <Card className="p-8 text-center text-on-surface-variant">
              <MdWarning className="mx-auto mb-2 text-3xl text-[#835100]" />
              No hay una emergencia activa disponible para gestionar obras.
            </Card>
          ) : cargando ? (
            <Card className="p-8 text-center text-on-surface-variant">Cargando obras y cuadrillas...</Card>
          ) : obrasPagina.length === 0 ? (
            <Card className="p-8 text-center">
              <MdConstruction className="mx-auto mb-2 text-4xl text-outline" />
              <p className="font-semibold text-on-surface">No hay obras para mostrar</p>
              <p className="mt-1 text-sm text-on-surface-variant">Crea una obra y luego podrás asignarla a una cuadrilla.</p>
            </Card>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {obrasPagina.map((obra, indice) => {
                const cuadrillaAsignada = cuadrillaPorObra.get(Number(obra.id));
                const estadoReal = obra.estado === 'completada' ? 'completada' : cuadrillaAsignada ? 'asignada' : obra.estado;
                const infoEstado = ESTADOS[estadoReal] || ESTADOS.disponible;
                const puedeAsignar = estadoReal === 'disponible';

                return (
                  <Card key={obra.id} hover className="flex min-h-[300px] flex-col gap-4 p-5 animate-fadeInUp" style={{ animationDelay: `${indice * 50}ms` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MdConstruction size={24} />
                      </div>
                      <Badge color={infoEstado.color}>{infoEstado.label}</Badge>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-on-surface">{obra.nombre}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">{obra.descripcion || 'Sin descripción'}</p>
                    </div>

                    {obra.familia && (
                      <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                        <MdGroups className="mt-0.5 flex-shrink-0 text-primary" />
                        <span>
                          Familia: <strong className="text-on-surface">{obra.familia.nombre_cabeza_familia}</strong>
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                      <MdLocationOn className="mt-0.5 flex-shrink-0 text-primary" />
                      <span>{obra.direccion || `${obra.lat}, ${obra.lng}`}</span>
                    </div>

                    {cuadrillaAsignada ? (
                      <div className="mt-auto rounded-xl border border-green-600/20 bg-green-50 p-3">
                        <p className="flex items-center gap-2 text-xs font-bold text-green-700"><MdGroups /> Cuadrilla asignada</p>
                        <p className="mt-1 text-sm font-semibold text-on-surface">{cuadrillaAsignada.nombre}</p>
                        <p className="text-xs text-on-surface-variant">{cuadrillaAsignada.miembrosCount ?? 0} integrantes · plazo {cuadrillaAsignada.plazo_dias || 5} días</p>
                      </div>
                    ) : obra.estado === 'asignada' ? (
                      <div className="mt-auto rounded-xl border border-amber-600/20 bg-amber-50 p-3 text-xs text-[#835100]">
                        <p className="flex items-center gap-2 font-bold"><MdWarning /> Estado inconsistente</p>
                        <p className="mt-1">La obra figura asignada, pero ninguna cuadrilla activa la referencia. Revísala antes de continuar.</p>
                      </div>
                    ) : puedeAsignar ? (
                      <div className="mt-auto space-y-2 border-t border-outline-variant/50 pt-3">
                        <label className="label">Asignar a cuadrilla</label>
                        <select
                          className="input-field"
                          value={seleccionCuadrilla[obra.id] || ''}
                          onChange={(e) => setSeleccionCuadrilla((prev) => ({ ...prev, [obra.id]: e.target.value }))}
                          disabled={cuadrillasElegibles.length === 0}
                        >
                          <option value="">— Selecciona cuadrilla —</option>
                          {cuadrillasElegibles.map((cuadrilla) => (
                            <option key={cuadrilla.id} value={cuadrilla.id}>
                              {cuadrilla.nombre} ({cuadrilla.miembrosCount}/11)
                            </option>
                          ))}
                        </select>
                        {cuadrillasElegibles.length === 0 && (
                          <p className="flex items-start gap-1 text-[11px] text-[#835100]">
                            <MdWarning className="mt-0.5 flex-shrink-0" />
                            No hay cuadrillas libres con al menos 10 integrantes en esta emergencia.
                          </p>
                        )}
                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => handleAsignar(obra)}
                          disabled={!seleccionCuadrilla[obra.id] || asignandoObraId === obra.id}
                        >
                          <MdAssignment />
                          {asignandoObraId === obra.id ? 'Asignando...' : 'Asignar obra'}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </section>
          )}

          {obrasFiltradas.length > 0 && (
            <section className="card flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
              <p className="text-sm text-on-surface-variant">
                Mostrando {((paginaSegura - 1) * POR_PAGINA) + 1} a {Math.min(paginaSegura * POR_PAGINA, obrasFiltradas.length)} de {obrasFiltradas.length} obras
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" type="button" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>Anterior</Button>
                <span className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">{paginaSegura} / {totalPaginas}</span>
                <Button variant="ghost" type="button" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>Siguiente</Button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
