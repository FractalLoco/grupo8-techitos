// Servicio para obtener y manipular datos del mapa: obras, cuadrillas con estado y zonas de peligro

const BASE_URL = 'http://localhost:3000/api';

// Cabeceras con el token JWT almacenado en localStorage
const obtenerHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// Obtiene las cuadrillas de una emergencia con su color de estado (verde/amarillo/rojo/gris/azul)
// El color depende de los dias transcurridos respecto al plazo asignado
export const obtenerCuadrillasConEstado = async (emergenciaId) => {
  const res = await fetch(
    `${BASE_URL}/cuadrillas/emergencia/${emergenciaId}/estado`,
    { headers: obtenerHeaders() }
  );
  return res.json();
};

// Obtiene las obras de una emergencia para pintarlas como puntos en el mapa
// Cada obra tiene lat y lng que Leaflet usa para posicionarla
export const obtenerObrasPorEmergencia = async (emergenciaId) => {
  const res = await fetch(
    `${BASE_URL}/obras/emergencia/${emergenciaId}`,
    { headers: obtenerHeaders() }
  );
  return res.json();
};

// Obtiene las zonas de peligro de una emergencia para pintarlas como circulos coloreados
export const obtenerZonasPeligro = async (emergenciaId) => {
  const res = await fetch(
    `${BASE_URL}/zonas-peligro/emergencia/${emergenciaId}`,
    { headers: obtenerHeaders() }
  );
  return res.json();
};

// Crea una zona de peligro en el punto donde el coordinador hizo clic en el mapa
// Body: { lat, lng, radio, tipo ('amarilla'|'roja'), comentario, emergencia_id }
export const crearZonaPeligro = async (datos) => {
  const res = await fetch(`${BASE_URL}/zonas-peligro`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datos),
  });
  return res.json();
};

// Elimina una zona de peligro del mapa segun su ID
export const eliminarZonaPeligro = async (zonaId) => {
  const res = await fetch(`${BASE_URL}/zonas-peligro/${zonaId}`, {
    method: 'DELETE',
    headers: obtenerHeaders(),
  });
  return res.json();
};

// Registra una obra nueva en la emergencia con nombre, descripcion y coordenadas
// Body: { nombre, descripcion, lat, lng, emergencia_id }
export const crearObra = async (datos) => {
  const res = await fetch(`${BASE_URL}/obras`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datos),
  });
  return res.json();
};

// Geocodifica y devuelve el primer resultado { lat, lng, nombre }. Usar solo cuando se necesita
// un resultado unico; para seleccion por el usuario usar buscarDireccionesMultiples.
export const geocodificarDireccion = async (direccion) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion)}&format=json&limit=1&countrycodes=cl`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'techo-app/1.0' },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    nombre: data[0].display_name,
  };
};

// Busca multiples resultados usando Photon (Komoot): mismo OSM pero con motor de autocompletado
// que reconoce abreviaciones como "Pje.", "Av.", "Psje." mejor que Nominatim.
// El bbox limita resultados al territorio de Chile (lon_min, lat_min, lon_max, lat_max).
export const buscarDireccionesMultiples = async (texto) => {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}&limit=5&lang=es&bbox=-75.7,-56.0,-66.9,-17.5`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  const data = await res.json();
  if (!data?.features || data.features.length === 0) return [];
  return data.features.map((feature) => {
    const p = feature.properties || {};
    // GeoJSON: coordinates es [lng, lat]
    const lng = feature.geometry.coordinates[0];
    const lat = feature.geometry.coordinates[1];
    const partes = [
      p.street || p.name || '',
      p.housenumber || '',
      p.suburb || p.district || '',
      p.city || p.town || p.village || p.municipality || '',
      p.state || '',
    ].filter(Boolean);
    const etiqueta = partes.join(', ') || p.name || 'Ubicacion sin nombre';
    return { lat, lng, etiqueta, detalle: etiqueta };
  });
};

// Convierte lat/lng en una direccion legible (calle, numero, ciudad) usando Nominatim inverso
// Respetar el limite de 1 solicitud por segundo de Nominatim
export const reverseGeocodificar = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'es', 'User-Agent': 'techo-app/1.0' },
  });
  const data = await res.json();
  if (!data || data.error) return null;
  // Construye una direccion corta: calle numero, barrio, ciudad
  const a = data.address || {};
  const partes = [
    a.road || a.pedestrian || a.path || '',
    a.house_number || '',
    a.suburb || a.neighbourhood || a.quarter || '',
    a.city || a.town || a.municipality || a.village || '',
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(', ') : data.display_name;
};
