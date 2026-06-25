// Mapa interactivo con Leaflet: muestra obras y zonas de peligro.
// El voluntario puede ver su posicion actual, la distancia a cada obra y navegar con Google Maps o Waze.
// El coordinador puede crear obras y zonas de peligro por clic o por busqueda de direccion.
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAutenticacion } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  obtenerCuadrillasConEstado,
  obtenerObrasPorEmergencia,
  obtenerZonasPeligro,
  crearZonaPeligro,
  eliminarZonaPeligro,
  crearObra,
  buscarDireccionesMultiples,
  reverseGeocodificar,
} from '../services/mapaService';
import { obtenerEmergencias } from '../services/emergenciaService';

// Icono reutilizable para el marcador de punto buscado
const iconoPunto = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Colores para los marcadores de obras segun el estado calculado por el backend
const COLOR_ESTADO = {
  verde: '#27ae60',    // en plazo
  amarillo: '#e67e22', // mas del 70% del tiempo consumido
  rojo: '#e74c3c',     // plazo vencido o alerta activa
  gris: '#95a5a6',     // cuadrilla completada
  azul: '#3498db',     // obra sin cuadrilla asignada aun
};

// Colores para las zonas de peligro dibujadas como circulos en el mapa
const COLOR_ZONA = {
  amarilla: '#f39c12', // dificil de atravesar
  roja: '#e74c3c',     // imposible pasar
};

const ETIQUETAS_ESTADO = {
  todos: 'Todos',
  verde: 'En plazo',
  amarillo: 'Riesgo retraso',
  rojo: 'Vencida / Alerta',
  gris: 'Completada',
  azul: 'Sin asignar',
};

// Captura clics en el mapa cuando alguno de los dos modos de edicion esta activo
function CapturadorClic({ modoZona, modoObra, bloqueado, onClic }) {
  useMapEvents({
    click(e) {
      if (bloqueado) return;
      // Envia el punto con una etiqueta para que el handler sepa que tipo crear
      if (modoZona) onClic(e.latlng, 'zona');
      else if (modoObra) onClic(e.latlng, 'obra');
    },
  });
  return null;
}

// Vuela el mapa a las coordenadas indicadas cuando cambian (tras geocodificar o centrar en obra)
function ControladorVuelo({ centro, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (centro) map.flyTo(centro, zoom || 16, { duration: 1.2 });
  }, [centro, map, zoom]);
  return null;
}

// Distancia en km entre dos puntos usando la formula de Haversine
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Genera la URL de navegacion para abrir la aplicacion de mapas del dispositivo
function urlGoogleMaps(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
function urlWaze(lat, lng) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export default function Mapa() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';

  // Datos del mapa cargados desde el backend
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaSeleccionada, setEmergenciaSeleccionada] = useState('');
  const [obras, setObras] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [filtroColor, setFiltroColor] = useState('todos');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  // Obra seleccionada en el selector de ubicaciones (vuela el mapa a ella)
  const [obraSeleccionadaId, setObraSeleccionadaId] = useState('');

  // Estado de geocoding con multiples resultados (solo dentro del modal de crear obra)
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]); // lista de opciones
  const [puntoGeocoded, setPuntoGeocoded] = useState(null);
  const [centroVuelo, setCentroVuelo] = useState(null);

  // Estado del modo "agregar zona de peligro"
  const [modoAgregarZona, setModoAgregarZona] = useState(false);
  const [puntoZona, setPuntoZona] = useState(null);
  const [formZona, setFormZona] = useState({ tipo: 'amarilla', comentario: '', radio: 200 });
  const [mostrarFormZona, setMostrarFormZona] = useState(false);
  const [guardandoZona, setGuardandoZona] = useState(false);

  // Estado del modo "crear obra"
  const [modoCrearObra, setModoCrearObra] = useState(false);
  const [puntoObra, setPuntoObra] = useState(null);
  const [formObra, setFormObra] = useState({ nombre: '', descripcion: '' });
  const [mostrarFormObra, setMostrarFormObra] = useState(false);
  const [guardandoObra, setGuardandoObra] = useState(false);

  // Carga emergencias activas al montar para el selector superior
  useEffect(() => {
    obtenerEmergencias()
      .then((res) => {
        const lista = res.datos?.emergencias || res.datos || [];
        const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
        setEmergencias(activas);
        if (activas.length > 0) setEmergenciaSeleccionada(String(activas[0].id));
      })
      .catch(() => setError('No se pudieron cargar las emergencias'));
  }, []);

  // Recarga obras, cuadrillas y zonas cada vez que cambia la emergencia seleccionada
  useEffect(() => {
    if (!emergenciaSeleccionada) return;
    setCargando(true);
    setError('');
    Promise.all([
      obtenerCuadrillasConEstado(emergenciaSeleccionada),
      obtenerObrasPorEmergencia(emergenciaSeleccionada),
      obtenerZonasPeligro(emergenciaSeleccionada),
    ])
      .then(([resCuadrillas, resObras, resZonas]) => {
        setCuadrillas(resCuadrillas.datos?.cuadrillas || []);
        setObras(resObras.datos?.obras || []);
        setZonas(resZonas.datos?.zonas || []);
      })
      .catch(() => setError('Error al cargar datos del mapa'))
      .finally(() => setCargando(false));
  }, [emergenciaSeleccionada]);

  // Cuando cambian las obras, obtiene la direccion postal de cada una en segundo plano.
  // Respeta el limite de 1 solicitud/segundo de Nominatim con una pausa entre llamadas.
  useEffect(() => {
    if (obras.length === 0) {
      setDireccionesObras({});
      return;
    }
    let cancelado = false;
    const obtenerDirecciones = async () => {
      for (const obra of obras) {
        if (cancelado) break;
        // Solo consulta si aun no tenemos la direccion de esta obra
        if (direccionesObras[obra.id]) continue;
        try {
          const dir = await reverseGeocodificar(obra.lat, obra.lng);
          if (dir && !cancelado) {
            setDireccionesObras((prev) => ({ ...prev, [obra.id]: dir }));
          }
        } catch {}
        // Pausa para no superar el limite de tasa de Nominatim
        await new Promise((r) => setTimeout(r, 1200));
      }
    };
    obtenerDirecciones();
    return () => { cancelado = true; };
  // No incluyo direccionesObras en deps para evitar re-ejecucion infinita
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obras]);

  // Vuela el mapa a la obra seleccionada en el selector de ubicaciones
  const handleSeleccionarObra = (obraId) => {
    setObraSeleccionadaId(obraId);
    if (!obraId) return;
    const obra = obras.find((o) => String(o.id) === String(obraId));
    if (obra) {
      setCentroVuelo([obra.lat, obra.lng]);
      setZoomVuelo(17);
    }
  };

  // Busqueda predictiva en el modal de crear obra: se activa 400ms despues de dejar de escribir
  useEffect(() => {
    const texto = busqueda.trim();
    if (texto.length < 3) {
      setResultadosBusqueda([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const resultados = await buscarDireccionesMultiples(texto);
        if (resultados.length === 1) {
          handleElegirResultado(resultados[0]);
        } else {
          setResultadosBusqueda(resultados);
        }
      } catch {
        // falla silenciosa
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  // handleElegirResultado usa estados del closure; no incluirla evita el loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  // Aplica el resultado elegido: actualiza el punto y vuela el mapa
  const handleElegirResultado = (resultado) => {
    setPuntoGeocoded(resultado);
    setResultadosBusqueda([]);
    setCentroVuelo([resultado.lat, resultado.lng]);
    if (mostrarFormObra) {
      setPuntoObra({ lat: resultado.lat, lng: resultado.lng });
    } else if (modoAgregarZona) {
      setPuntoZona({ lat: resultado.lat, lng: resultado.lng });
      setMostrarFormZona(true);
    } else if (modoCrearObra) {
      setPuntoObra({ lat: resultado.lat, lng: resultado.lng });
      setMostrarFormObra(true);
    }
  };

  // Maneja el clic en el mapa distinguiendo si es para zona o para obra
  const handleClicMapa = (latlng, tipo) => {
    if (tipo === 'zona') {
      setPuntoZona(latlng);
      setMostrarFormZona(true);
    } else if (tipo === 'obra') {
      setPuntoObra(latlng);
      setMostrarFormObra(true);
    }
  };

  // Guarda la zona de peligro en el backend y actualiza la lista local
  const handleGuardarZona = async () => {
    if (!puntoZona) return;
    setGuardandoZona(true);
    try {
      await crearZonaPeligro({
        lat: puntoZona.lat,
        lng: puntoZona.lng,
        radio: Number(formZona.radio),
        tipo: formZona.tipo,
        comentario: formZona.comentario,
        emergencia_id: Number(emergenciaSeleccionada),
      });
      // Recarga solo zonas para no perder lo ya cargado
      const resZonas = await obtenerZonasPeligro(emergenciaSeleccionada);
      setZonas(resZonas.datos?.zonas || []);
      cancelarModoZona();
      mostrarExito('Zona de peligro agregada al mapa');
    } catch {
      setError('Error al guardar la zona');
    } finally {
      setGuardandoZona(false);
    }
  };

  // Guarda la obra nueva en el backend y actualiza la lista local
  const handleGuardarObra = async () => {
    if (!puntoObra) return;
    if (!formObra.nombre.trim()) {
      setError('El nombre de la obra es obligatorio');
      return;
    }
    setGuardandoObra(true);
    try {
      await crearObra({
        nombre: formObra.nombre,
        descripcion: formObra.descripcion,
        lat: puntoObra.lat,
        lng: puntoObra.lng,
        emergencia_id: Number(emergenciaSeleccionada),
      });
      // Recarga obras para mostrar el nuevo punto en el mapa
      const resObras = await obtenerObrasPorEmergencia(emergenciaSeleccionada);
      setObras(resObras.datos?.obras || []);
      cancelarModoObra();
      mostrarExito('Obra creada y visible en el mapa');
    } catch {
      setError('Error al crear la obra');
    } finally {
      setGuardandoObra(false);
    }
  };

  // Elimina una zona del mapa y la quita de la lista local inmediatamente
  const handleEliminarZona = async (zonaId) => {
    if (!window.confirm('Eliminar esta zona de peligro del mapa?')) return;
    try {
      await eliminarZonaPeligro(zonaId);
      setZonas((prev) => prev.filter((z) => z.id !== zonaId));
      mostrarExito('Zona eliminada');
    } catch {
      setError('Error al eliminar la zona');
    }
  };

  const mostrarExito = (texto) => {
    setMensajeExito(texto);
    setTimeout(() => setMensajeExito(''), 3500);
  };

  const cancelarModoZona = () => {
    setModoAgregarZona(false);
    setMostrarFormZona(false);
    setPuntoZona(null);
    setFormZona({ tipo: 'amarilla', comentario: '', radio: 200 });
  };

  const cancelarModoObra = () => {
    setModoCrearObra(false);
    setMostrarFormObra(false);
    setPuntoObra(null);
    setFormObra({ nombre: '', descripcion: '' });
    setBusqueda('');
    setPuntoGeocoded(null);
    setResultadosBusqueda([]);
  };

  // Activa un modo y desactiva el otro para que no interfieran
  const activarModoZona = () => {
    cancelarModoObra();
    setModoAgregarZona(true);
  };
  const activarModoObra = () => {
    cancelarModoZona();
    setModoCrearObra(true);
  };

  // Filtra obras segun el color de la cuadrilla asignada
  const obrasFiltradas = obras.filter((obra) => {
    if (filtroColor === 'todos') return true;
    const cuadrilla = cuadrillas.find((c) => c.obra_asignada_id === obra.id);
    if (!cuadrilla) return filtroColor === 'azul';
    return cuadrilla.estadoColor === filtroColor;
  });

  const getColorObra = (obraId) => {
    const cuadrilla = cuadrillas.find((c) => c.obra_asignada_id === obraId);
    if (!cuadrilla) return COLOR_ESTADO.azul;
    return COLOR_ESTADO[cuadrilla.estadoColor] || COLOR_ESTADO.azul;
  };

  const getCuadrillaDeObra = (obraId) =>
    cuadrillas.find((c) => c.obra_asignada_id === obraId) || null;

  // Direcciones legibles de cada obra obtenidas por geocodificacion inversa (obraId -> string)
  const [direccionesObras, setDireccionesObras] = useState({});

  // Estado de geolocalizacion: posicion actual del dispositivo del voluntario
  const [miPosicion, setMiPosicion] = useState(null);       // { lat, lng }
  const [obteniendoPosicion, setObteniendoPosicion] = useState(false);
  const [zoomVuelo, setZoomVuelo] = useState(16);

  // Solicita la posicion GPS del dispositivo y vuela el mapa ahi
  const handleObtenerMiPosicion = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalizacion');
      return;
    }
    setObteniendoPosicion(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMiPosicion({ lat: latitude, lng: longitude });
        // Vuela el mapa a la posicion actual del usuario
        setCentroVuelo([latitude, longitude]);
        setZoomVuelo(16);
        setObteniendoPosicion(false);
      },
      () => {
        setError('No se pudo obtener tu posicion. Verifica que el permiso de ubicacion este activado.');
        setObteniendoPosicion(false);
      }
    );
  };

  // Para el jefe: vuela el mapa a la obra de su cuadrilla asignada
  const handleIrAMiObra = () => {
    const miCuadrilla = cuadrillas.find((c) => c.jefe_id === usuario?.id);
    if (!miCuadrilla?.obra_asignada_id) {
      setError('Tu cuadrilla no tiene obra asignada aun');
      return;
    }
    const obra = obras.find((o) => o.id === miCuadrilla.obra_asignada_id);
    if (obra) {
      setCentroVuelo([obra.lat, obra.lng]);
      setZoomVuelo(17);
    }
  };

  // El modo activo determina el cursor y el mensaje de instruccion en el mapa
  const modoActivo = modoAgregarZona ? 'zona' : modoCrearObra ? 'obra' : null;

  // Datos de la emergencia seleccionada para mostrar su zona en el mapa
  const emergenciaActual = emergencias.find((e) => String(e.id) === emergenciaSeleccionada);

  // Cuadrilla del jefe actual para resaltar su obra asignada con un marcador mas grande
  const cuadrillaDelUsuario =
    usuario?.rol === 'jefe_cuadrilla'
      ? cuadrillas.find((c) => c.jefe_id === usuario.id)
      : null;
  const obraDelUsuarioId = cuadrillaDelUsuario?.obra_asignada_id || null;

  // Las zonas de peligro solo se muestran si hay obras registradas en la emergencia.
  // Sin obras no tiene sentido mostrar zonas: no hay trabajo activo que proteger.
  const zonasVisibles = obras.length > 0 ? zonas : [];

  const centroMapa = [-33.4569, -70.6483]; // Santiago de Chile por defecto

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navbar />

      {/* marginTop igual a la altura del Navbar (60px) para que el mapa empiece justo debajo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '60px', overflow: 'hidden' }}>

        {/* Fila 1: selector de emergencia + filtros + botones de modo */}
        <div style={{
          padding: '8px 16px',
          background: '#1a3a5c',
          color: 'white',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          zIndex: 10,
        }}>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Emergencia:
            <select
              value={emergenciaSeleccionada}
              onChange={(e) => setEmergenciaSeleccionada(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', fontSize: '13px' }}
            >
              {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
              {emergencias.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </label>

          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>Filtrar:</span>
          {Object.keys(ETIQUETAS_ESTADO).map((color) => (
            <button
              key={color}
              onClick={() => setFiltroColor(color)}
              style={{
                padding: '3px 10px',
                borderRadius: '12px',
                border: `2px solid ${filtroColor === color ? 'white' : 'transparent'}`,
                background: color === 'todos' ? '#4a6fa5' : COLOR_ESTADO[color],
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: filtroColor === color ? 'bold' : 'normal',
              }}
            >
              {ETIQUETAS_ESTADO[color]}
            </button>
          ))}

          {/* Boton de geolocalizacion: todos los roles pueden ver su posicion */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleObtenerMiPosicion}
              disabled={obteniendoPosicion}
              title="Muestra tu posicion actual en el mapa"
              style={{
                padding: '5px 14px',
                borderRadius: '4px',
                border: 'none',
                background: miPosicion ? '#2980b9' : '#3498db',
                color: 'white',
                cursor: obteniendoPosicion ? 'wait' : 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              {obteniendoPosicion ? 'Localizando...' : miPosicion ? 'Actualizar posicion' : 'Mi posicion'}
            </button>

            {/* Jefe puede volar directo a su obra asignada */}
            {usuario?.rol === 'jefe_cuadrilla' && (
              <button
                onClick={handleIrAMiObra}
                title="Centra el mapa en tu obra asignada"
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#8e44ad',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                Ir a mi obra
              </button>
            )}
          </div>

          {/* Botones de modo edicion solo para coordinador */}
          {esCoordinador && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={modoCrearObra ? cancelarModoObra : activarModoObra}
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  background: modoCrearObra ? '#e74c3c' : '#27ae60',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {modoCrearObra ? 'Cancelar obra' : 'Crear obra'}
              </button>
              {/* Solo habilita zonas de peligro si hay obras: la logica visual lo requiere */}
              <button
                onClick={modoAgregarZona ? cancelarModoZona : activarModoZona}
                disabled={!modoAgregarZona && obras.length === 0}
                title={obras.length === 0 ? 'Primero crea al menos una obra en el mapa' : ''}
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  background: modoAgregarZona ? '#e74c3c' : obras.length === 0 ? '#bdc3c7' : '#f39c12',
                  color: 'white',
                  cursor: !modoAgregarZona && obras.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '13px',
                }}
              >
                {modoAgregarZona ? 'Cancelar zona' : 'Zona de peligro'}
              </button>
            </div>
          )}

          {cargando && <span style={{ fontSize: '12px', opacity: 0.7 }}>Cargando...</span>}
        </div>

        {/* Fila 2: selector de obras disponibles en la emergencia para navegar a ellas */}
        <div style={{
          padding: '6px 16px',
          background: '#eef2f7',
          borderBottom: '1px solid #d0d8e4',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '12px', color: '#1a3a5c', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            Ir a obra:
          </span>

          {obras.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#95a5a6', fontStyle: 'italic' }}>
              No hay obras registradas en esta emergencia
            </span>
          ) : (
            <select
              value={obraSeleccionadaId}
              onChange={(e) => handleSeleccionarObra(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #b0bec5',
                fontSize: '13px',
                color: '#1a3a5c',
                background: 'white',
              }}
            >
              <option value="">Seleccionar ubicacion...</option>
              {obras.map((obra) => {
                // Muestra la direccion legible si ya fue geocodificada, si no el nombre de la obra
                const etiqueta = direccionesObras[obra.id]
                  ? `${obra.nombre} — ${direccionesObras[obra.id]}`
                  : obra.nombre;
                return (
                  <option key={obra.id} value={obra.id}>{etiqueta}</option>
                );
              })}
            </select>
          )}

          {/* Muestra lat/lng + distancia de la obra seleccionada */}
          {obraSeleccionadaId && (() => {
            const o = obras.find((ob) => String(ob.id) === String(obraSeleccionadaId));
            if (!o) return null;
            const dist = miPosicion
              ? calcularDistanciaKm(miPosicion.lat, miPosicion.lng, o.lat, o.lng)
              : null;
            return (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '12px', color: '#1e8449',
                  background: '#eafaf1', border: '1px solid #a9dfbf',
                  padding: '3px 10px', borderRadius: '4px', whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}>
                  Lat: {o.lat.toFixed(5)} | Lng: {o.lng.toFixed(5)}
                </span>
                {dist !== null && (
                  <span style={{ fontSize: '12px', color: '#2980b9', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {dist < 1 ? `${Math.round(dist * 1000)} m de ti` : `${dist.toFixed(2)} km de ti`}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Instruccion cuando hay modo activo de coordinador */}
          {modoActivo && (
            <span style={{ fontSize: '12px', color: '#7f6000', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
              Haz clic en el mapa para posicionar
            </span>
          )}
        </div>

        {/* Aviso si la emergencia no tiene obras: sin puntos no se muestran zonas de peligro */}
        {!cargando && emergenciaSeleccionada && obras.length === 0 && (
          <div style={{
            padding: '6px 16px',
            background: '#7f8c8d',
            color: 'white',
            fontSize: '12px',
            textAlign: 'center',
          }}>
            No hay obras registradas en esta emergencia. Las zonas de peligro no se muestran hasta que existan obras activas.
            {esCoordinador && ' Usa el boton "Crear obra" para agregar puntos de trabajo al mapa.'}
          </div>
        )}

        {/* Banner de instruccion cuando hay modo activo sin formulario abierto */}
        {modoActivo && !mostrarFormZona && !mostrarFormObra && (
          <div style={{
            padding: '6px 16px',
            background: modoActivo === 'zona' ? '#f39c12' : '#27ae60',
            color: 'white',
            fontSize: '13px',
            textAlign: 'center',
            fontWeight: 'bold',
          }}>
            {modoActivo === 'zona'
              ? 'Busca una direccion arriba o haz clic en el mapa para marcar la zona de peligro'
              : 'Busca una direccion arriba o haz clic en el mapa para ubicar la nueva obra'}
          </div>
        )}

        {/* Mensajes de retroalimentacion */}
        {error && (
          <div style={{ padding: '5px 16px', background: '#e74c3c', color: 'white', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
          </div>
        )}
        {mensajeExito && (
          <div style={{ padding: '5px 16px', background: '#27ae60', color: 'white', fontSize: '13px' }}>
            {mensajeExito}
          </div>
        )}

        {/* Leyenda de colores */}
        <div style={{
          padding: '5px 16px',
          background: '#f0f4f8',
          fontSize: '12px',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
          borderBottom: '1px solid #ddd',
        }}>
          <span style={{ fontWeight: 'bold', color: '#1a3a5c' }}>Obras:</span>
          {Object.entries(COLOR_ESTADO).map(([clave, color]) => (
            <span key={clave} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: color, display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
              <span style={{ color: '#333' }}>{ETIQUETAS_ESTADO[clave]}</span>
            </span>
          ))}
          <span style={{ fontWeight: 'bold', color: '#1a3a5c', marginLeft: '8px' }}>Zonas:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: COLOR_ZONA.amarilla, opacity: 0.8, display: 'inline-block' }} />
            <span style={{ color: '#333' }}>Dificil de pasar</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: COLOR_ZONA.roja, opacity: 0.8, display: 'inline-block' }} />
            <span style={{ color: '#333' }}>Imposible pasar</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#2980b9', border: '2px solid white', boxShadow: '0 0 0 2px #2980b9', display: 'inline-block' }} />
            <span style={{ color: '#333' }}>Tu posicion</span>
          </span>
        </div>

        {/* Contenedor del mapa Leaflet */}
        <div style={{ flex: 1, position: 'relative' }}>
          {emergencias.length === 0 && !cargando ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: '15px' }}>
              No hay emergencias activas para mostrar en el mapa.
            </div>
          ) : (
            <MapContainer
              center={centroMapa}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              {/* Capa de tiles CartoDB Positron — mas limpio que OSM estandar, sin API key */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {/* Vuela al punto objetivo cuando cambia (geocoding, mi posicion, mi obra) */}
              {centroVuelo && <ControladorVuelo centro={centroVuelo} zoom={zoomVuelo} />}

              {/* Posicion actual del usuario: circulo azul solido con anillo exterior */}
              {miPosicion && (
                <>
                  {/* Anillo exterior semitransparente para que sea visible sobre cualquier fondo */}
                  <Circle
                    center={[miPosicion.lat, miPosicion.lng]}
                    radius={40}
                    pathOptions={{ color: '#2980b9', fillColor: '#2980b9', fillOpacity: 0.15, weight: 1 }}
                  />
                  <CircleMarker
                    center={[miPosicion.lat, miPosicion.lng]}
                    radius={9}
                    pathOptions={{ color: 'white', fillColor: '#2980b9', fillOpacity: 1, weight: 3 }}
                  >
                    <Popup>
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#2980b9' }}>Tu posicion actual</strong>
                        <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#555' }}>
                          Lat: {miPosicion.lat.toFixed(6)}<br />
                          Lng: {miPosicion.lng.toFixed(6)}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </>
              )}

              {/* Captura clics cuando hay un modo activo y no hay formulario abierto */}
              <CapturadorClic
                modoZona={modoAgregarZona}
                modoObra={modoCrearObra}
                bloqueado={mostrarFormZona || mostrarFormObra}
                onClic={handleClicMapa}
              />

              {/* Zona de emergencia: circulo grande alrededor del centro de la emergencia.
                  Solo se dibuja si la emergencia tiene coordenadas registradas. */}
              {emergenciaActual?.lat && emergenciaActual?.lng && (
                <>
                  {/* Area exterior de impacto: circulo de 2km semitransparente */}
                  <Circle
                    center={[emergenciaActual.lat, emergenciaActual.lng]}
                    radius={2000}
                    pathOptions={{
                      color: '#e74c3c',
                      fillColor: '#e74c3c',
                      fillOpacity: 0.04,
                      weight: 2,
                      dashArray: '10 6',
                    }}
                  />
                  {/* Marcador central de la emergencia */}
                  <CircleMarker
                    center={[emergenciaActual.lat, emergenciaActual.lng]}
                    radius={10}
                    pathOptions={{
                      color: '#c0392b',
                      fillColor: '#e74c3c',
                      fillOpacity: 0.9,
                      weight: 3,
                    }}
                  >
                    <Popup minWidth={200}>
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#c0392b', fontSize: '14px' }}>Zona de emergencia</strong>
                        <div style={{ marginTop: '4px', fontWeight: 'bold' }}>{emergenciaActual.nombre}</div>
                        {emergenciaActual.descripcion && (
                          <div style={{ color: '#555', marginTop: '2px', fontSize: '12px' }}>{emergenciaActual.descripcion}</div>
                        )}
                        <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                          Lat: {emergenciaActual.lat.toFixed(6)}<br />
                          Lng: {emergenciaActual.lng.toFixed(6)}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#888' }}>
                          Radio de impacto: 2 km
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </>
              )}

              {/* Marcador del punto geocodificado (direccion buscada) */}
              {puntoGeocoded && (
                <Marker position={[puntoGeocoded.lat, puntoGeocoded.lng]} icon={iconoPunto}>
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <strong>Resultado de busqueda</strong>
                      <div style={{ color: '#555', marginTop: '2px', maxWidth: '200px' }}>{puntoGeocoded.nombre}</div>
                      <div style={{ marginTop: '4px', color: '#1a3a5c' }}>
                        Lat: {puntoGeocoded.lat.toFixed(6)}<br />
                        Lng: {puntoGeocoded.lng.toFixed(6)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Marcadores de obras filtradas por estado */}
              {obrasFiltradas.map((obra) => {
                const cuadrilla = getCuadrillaDeObra(obra.id);
                const color = getColorObra(obra.id);
                // La obra del usuario (jefe) se dibuja mas grande para que la identifique de un vistazo
                const esMiObra = obra.id === obraDelUsuarioId;
                const radio = esMiObra ? 18 : 13;
                const direccion = direccionesObras[obra.id];
                const distanciaKm = miPosicion
                  ? calcularDistanciaKm(miPosicion.lat, miPosicion.lng, obra.lat, obra.lng)
                  : null;

                return (
                  <CircleMarker
                    key={obra.id}
                    // lat y lng guardados en la BD al registrar la obra (por clic o por geocoding)
                    center={[obra.lat, obra.lng]}
                    radius={radio}
                    pathOptions={{
                      color: esMiObra ? 'white' : color,
                      fillColor: color,
                      fillOpacity: 0.9,
                      weight: esMiObra ? 4 : 2,
                    }}
                  >
                    <Popup minWidth={260}>
                      <div style={{ fontSize: '13px', lineHeight: '1.7' }}>

                        {/* Etiqueta "Tu obra" si es la del jefe autenticado */}
                        {esMiObra && (
                          <div style={{ marginBottom: '6px', padding: '3px 8px', background: '#8e44ad', color: 'white', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' }}>
                            Tu obra asignada
                          </div>
                        )}

                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a3a5c' }}>{obra.nombre}</div>
                        {obra.descripcion && (
                          <div style={{ color: '#555', fontSize: '12px', marginTop: '2px' }}>{obra.descripcion}</div>
                        )}

                        {/* Direccion postal obtenida por geocodificacion inversa */}
                        {direccion ? (
                          <div style={{ marginTop: '5px', padding: '5px 8px', background: '#f0f4f8', borderRadius: '4px', fontSize: '12px', color: '#1a3a5c', fontWeight: 'bold' }}>
                            {direccion}
                          </div>
                        ) : (
                          <div style={{ marginTop: '3px', fontSize: '11px', color: '#aaa' }}>Obteniendo direccion...</div>
                        )}

                        {/* Coordenadas exactas en formato legible para el voluntario */}
                        <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#777' }}>
                          Latitud: {obra.lat.toFixed(6)} | Longitud: {obra.lng.toFixed(6)}
                        </div>

                        {/* Distancia desde la posicion actual (requiere activar "Mi posicion") */}
                        {distanciaKm !== null && (
                          <div style={{ marginTop: '3px', fontSize: '12px', color: '#2980b9', fontWeight: 'bold' }}>
                            A {distanciaKm < 1
                              ? `${Math.round(distanciaKm * 1000)} metros de ti`
                              : `${distanciaKm.toFixed(2)} km de ti`}
                          </div>
                        )}

                        {/* Botones de navegacion que abren la app de mapas del dispositivo con destino cargado */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          <a
                            href={urlGoogleMaps(obra.lat, obra.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1, display: 'block', padding: '6px',
                              background: '#4285F4', color: 'white',
                              borderRadius: '4px', textAlign: 'center',
                              fontSize: '12px', fontWeight: 'bold', textDecoration: 'none',
                            }}
                          >
                            Google Maps
                          </a>
                          <a
                            href={urlWaze(obra.lat, obra.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1, display: 'block', padding: '6px',
                              background: '#33ccff', color: '#1a1a1a',
                              borderRadius: '4px', textAlign: 'center',
                              fontSize: '12px', fontWeight: 'bold', textDecoration: 'none',
                            }}
                          >
                            Waze
                          </a>
                        </div>

                        {/* Informacion de cuadrilla asignada */}
                        {cuadrilla ? (
                          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #eee' }}>
                            <div><strong>Cuadrilla:</strong> {cuadrilla.nombre}</div>
                            <div>Fase: <strong>{cuadrilla.fase || 'sin iniciar'}</strong> | Plazo: <strong>{cuadrilla.plazo_dias} dias</strong></div>
                            <div>Integrantes: <strong>{cuadrilla.miembrosCount}</strong></div>
                            {cuadrilla.alerta_emergencia && (
                              <div style={{ marginTop: '4px', padding: '4px 6px', background: '#fdecea', borderRadius: '4px', color: '#c0392b', fontWeight: 'bold', fontSize: '11px' }}>
                                ALERTA: {cuadrilla.descripcion_emergencia}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px', color: '#7f8c8d', fontSize: '12px' }}>Sin cuadrilla asignada</div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Circulos de zonas de peligro.
                  Solo se muestran si hay obras activas: sin puntos de trabajo no hay zonas relevantes. */}
              {zonasVisibles.map((zona) => (
                <Circle
                  key={zona.id}
                  // lat y lng del punto central elegido al crear la zona
                  center={[zona.lat, zona.lng]}
                  // radio define el area de peligro en metros
                  radius={zona.radio}
                  pathOptions={{
                    color: COLOR_ZONA[zona.tipo],
                    fillColor: COLOR_ZONA[zona.tipo],
                    fillOpacity: 0.3,
                    weight: 2,
                    dashArray: zona.tipo === 'amarilla' ? '6 4' : null,
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <strong style={{ color: COLOR_ZONA[zona.tipo] }}>
                        {zona.tipo === 'amarilla' ? 'Zona amarilla: dificil de pasar' : 'Zona roja: imposible pasar'}
                      </strong>
                      {zona.comentario && (
                        <p style={{ margin: '4px 0', color: '#444' }}>{zona.comentario}</p>
                      )}
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        Lat: {zona.lat.toFixed(6)} | Lng: {zona.lng.toFixed(6)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Radio: {zona.radio} m</div>
                      {esCoordinador && (
                        <button
                          onClick={() => handleEliminarZona(zona.id)}
                          style={{ marginTop: '6px', padding: '3px 10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Eliminar zona
                        </button>
                      )}
                    </div>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          )}
        </div>
      </div>

      {/* Modal: confirmar y guardar zona de peligro */}
      {mostrarFormZona && puntoZona && (
        <ModalMapa titulo="Nueva zona de peligro" onCerrar={cancelarModoZona}>
          {/* Coordenadas del punto elegido (por clic o geocoding) */}
          <InfoCoordenadas lat={puntoZona.lat} lng={puntoZona.lng} />

          <CampoModal label="Tipo de zona">
            <select
              value={formZona.tipo}
              onChange={(e) => setFormZona((f) => ({ ...f, tipo: e.target.value }))}
              style={estiloSelect}
            >
              <option value="amarilla">Amarilla - Dificil de pasar</option>
              <option value="roja">Roja - Imposible pasar</option>
            </select>
          </CampoModal>

          <CampoModal label="Radio (metros)">
            <input
              type="number"
              value={formZona.radio}
              onChange={(e) => setFormZona((f) => ({ ...f, radio: e.target.value }))}
              min="50"
              max="5000"
              style={estiloInput}
            />
          </CampoModal>

          <CampoModal label="Comentario">
            <textarea
              value={formZona.comentario}
              onChange={(e) => setFormZona((f) => ({ ...f, comentario: e.target.value }))}
              rows={3}
              placeholder="Describe el peligro: derrumbe, inundacion, cables caidos..."
              style={{ ...estiloInput, resize: 'vertical' }}
            />
          </CampoModal>

          <BotonesModal
            onConfirmar={handleGuardarZona}
            onCancelar={cancelarModoZona}
            cargando={guardandoZona}
            textoConfirmar="Guardar zona"
            colorConfirmar="#f39c12"
          />
        </ModalMapa>
      )}

      {/* Modal: crear obra en el punto seleccionado */}
      {mostrarFormObra && puntoObra && (
        <ModalMapa titulo="Registrar obra" onCerrar={cancelarModoObra}>
          {/* Coordenadas del punto elegido por clic en el mapa */}
          <InfoCoordenadas lat={puntoObra.lat} lng={puntoObra.lng} />

          {/* Buscar por nombre de calle — muestra hasta 5 opciones para elegir */}
          <div style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '5px' }}>
              O busca la direccion para obtener coordenadas exactas:
            </span>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: Pasaje Dieciocho 5235, Hualpen"
                style={{ width: '100%', padding: '6px 10px', paddingRight: '80px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', boxSizing: 'border-box' }}
              />
              {buscando && (
                <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#999', pointerEvents: 'none' }}>
                  Buscando...
                </span>
              )}
            </div>

            {/* Lista de resultados para elegir el correcto */}
            {resultadosBusqueda.length > 0 && (
              <div style={{ marginTop: '6px', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#f0f4f8', padding: '4px 10px', fontSize: '11px', color: '#666', borderBottom: '1px solid #ddd' }}>
                  Elige la ubicacion correcta:
                </div>
                {resultadosBusqueda.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleElegirResultado(r)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 10px', fontSize: '12px', background: 'white',
                      border: 'none', borderBottom: i < resultadosBusqueda.length - 1 ? '1px solid #f0f0f0' : 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#eef2f7'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontWeight: 'bold', color: '#1a3a5c' }}>{r.etiqueta}</div>
                    <div style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace', marginTop: '2px' }}>
                      Lat: {r.lat.toFixed(6)} | Lng: {r.lng.toFixed(6)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {puntoGeocoded && resultadosBusqueda.length === 0 && (
              <div style={{ marginTop: '5px', fontSize: '11px', color: '#27ae60', fontWeight: 'bold' }}>
                Ubicacion aplicada: {puntoGeocoded.etiqueta || 'coordenadas actualizadas'}
              </div>
            )}
          </div>

          <CampoModal label="Nombre de la obra">
            <input
              type="text"
              value={formObra.nombre}
              onChange={(e) => setFormObra((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Casa Familia Martinez"
              style={estiloInput}
              autoFocus
            />
          </CampoModal>

          <CampoModal label="Descripcion (opcional)">
            <textarea
              value={formObra.descripcion}
              onChange={(e) => setFormObra((f) => ({ ...f, descripcion: e.target.value }))}
              rows={2}
              placeholder="Tipo de trabajo, materiales especiales..."
              style={{ ...estiloInput, resize: 'vertical' }}
            />
          </CampoModal>

          {error && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '0 0 8px' }}>{error}</p>}

          <BotonesModal
            onConfirmar={handleGuardarObra}
            onCancelar={cancelarModoObra}
            cargando={guardandoObra}
            textoConfirmar="Guardar obra"
            colorConfirmar="#27ae60"
          />
        </ModalMapa>
      )}
    </div>
  );
}

// Wrapper del modal flotante
function ModalMapa({ titulo, onCerrar, children }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white', padding: '28px', borderRadius: '8px',
        width: '380px', maxWidth: '92vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#1a3a5c', fontSize: '16px' }}>{titulo}</h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>X</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Muestra las coordenadas del punto elegido dentro del formulario
function InfoCoordenadas({ lat, lng }) {
  return (
    <div style={{ marginBottom: '14px', padding: '8px 12px', background: '#eef2f7', borderRadius: '6px', fontSize: '12px', color: '#1a3a5c' }}>
      <strong>Coordenadas del punto:</strong>
      <div style={{ marginTop: '2px', fontFamily: 'monospace', fontSize: '13px' }}>
        Latitud: {lat.toFixed(6)} | Longitud: {lng.toFixed(6)}
      </div>
    </div>
  );
}

// Etiqueta + campo de formulario reutilizable
function CampoModal({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: '12px' }}>
      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '4px' }}>{label}:</span>
      {children}
    </label>
  );
}

// Botones confirmar / cancelar del modal
function BotonesModal({ onConfirmar, onCancelar, cargando, textoConfirmar, colorConfirmar }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
      <button
        onClick={onConfirmar}
        disabled={cargando}
        style={{
          flex: 1, padding: '9px',
          background: cargando ? '#95a5a6' : colorConfirmar,
          color: 'white', border: 'none', borderRadius: '4px',
          cursor: cargando ? 'not-allowed' : 'pointer',
          fontWeight: 'bold', fontSize: '13px',
        }}
      >
        {cargando ? 'Guardando...' : textoConfirmar}
      </button>
      <button
        onClick={onCancelar}
        disabled={cargando}
        style={{
          flex: 1, padding: '9px',
          background: '#95a5a6', color: 'white',
          border: 'none', borderRadius: '4px',
          cursor: 'pointer', fontSize: '13px',
        }}
      >
        Cancelar
      </button>
    </div>
  );
}

// Estilos reutilizables para inputs del formulario
const estiloInput = {
  display: 'block', width: '100%', padding: '7px',
  borderRadius: '4px', border: '1px solid #ccc',
  fontSize: '13px', boxSizing: 'border-box',
};

const estiloSelect = {
  ...estiloInput,
};
