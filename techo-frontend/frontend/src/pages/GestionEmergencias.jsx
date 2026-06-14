<<<<<<< Updated upstream
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

=======
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import Navbar from "../components/Navbar";
import { buscarDireccionesMultiples } from "../services/mapaService";
>>>>>>> Stashed changes
import {
  obtenerEmergencias,
  crearEmergencia,
  actualizarEmergencia,
  cerrarEmergencia,
<<<<<<< Updated upstream
} from '../services/emergenciaService';
=======
  obtenerFamilias,
} from "../services/emergenciaService";
>>>>>>> Stashed changes

// Icono estandar de Leaflet — se define fuera del componente para no recrearlo en cada render
const iconoMiniMapa = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Vuela el mapa al punto elegido desde el dropdown.
// El flag volarRef evita que el drag del marcador dispare flyTo en loop.
function MiniMapaVolador({ lat, lng, volarRef }) {
  const map = useMap();
  useEffect(() => {
    if (volarRef.current) {
      map.flyTo([parseFloat(lat), parseFloat(lng)], 15, { duration: 1.0 });
      volarRef.current = false;
    }
  }, [lat, lng, map, volarRef]);
  return null;
}

function GestionEmergencias() {
  const [emergencias, setEmergencias] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [emergenciaSeleccionada, setEmergenciaSeleccionada] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [formulario, setFormulario] = useState({
    nombre: '',
    fechaInicio: '',
    ubicacion: '',
    descripcion: '',
    familiasAfectadas: '',
  });

<<<<<<< Updated upstream
  const [editandoId, setEditandoId] = useState(null);
=======
  const [direccionBusqueda, setDireccionBusqueda] = useState("");
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [resultadosDireccion, setResultadosDireccion] = useState([]);
  const [direccionElegida, setDireccionElegida] = useState("");

  // Flag: true cuando el usuario elige un resultado del dropdown.
  // MiniMapaVolador lo lee y lo resetea para que el drag no dispare flyTo.
  const coordsDesdeDropdown = useRef(false);

  const obtenerId = (e) => e._id || e.id;
>>>>>>> Stashed changes

  async function cargarEmergencias() {
    try {
      const data = await obtenerEmergencias();
<<<<<<< Updated upstream

      if (Array.isArray(data)) {
        setEmergencias(data);
      } else if (Array.isArray(data.data)) {
        setEmergencias(data.data);
      } else {
        setEmergencias([]);
      }
    } catch (error) {
      console.error(error);
=======
      const lista = data?.datos?.emergencias || data?.datos || data || [];
      setEmergencias(Array.isArray(lista) ? lista : []);
    } catch {
      setEmergencias([]);
>>>>>>> Stashed changes
    }
  }

  useEffect(() => {
    cargarEmergencias();
  }, []);

  const cargarFamilias = async (id) => {
    try {
      const data = await obtenerFamilias(id);
      setFamilias(data?.datos?.familias || data?.familias || []);
      setEmergenciaSeleccionada(id);
    } catch {
      setFamilias([]);
    }
  };

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  // Busqueda predictiva: se activa 400ms despues de que el usuario deja de escribir
  useEffect(() => {
    const texto = direccionBusqueda.trim();
    if (texto.length < 3) {
      setResultadosDireccion([]);
      setBuscandoDireccion(false);
      return;
    }
    setBuscandoDireccion(true);
    const timer = setTimeout(async () => {
      try {
        const resultados = await buscarDireccionesMultiples(texto);
        setResultadosDireccion(resultados);
      } catch {
        // falla silenciosa: el usuario puede seguir escribiendo
      } finally {
        setBuscandoDireccion(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [direccionBusqueda]);

  const handleElegirDireccion = (resultado) => {
    coordsDesdeDropdown.current = true;
    setFormulario((f) => ({
      ...f,
      lat: resultado.lat.toFixed(6),
      lng: resultado.lng.toFixed(6),
    }));
    setDireccionElegida(resultado.etiqueta);
    setResultadosDireccion([]);
  };

  // Limpia solo la ubicacion sin tocar nombre/descripcion
  const limpiarUbicacion = () => {
    setFormulario((f) => ({ ...f, lat: '', lng: '' }));
    setDireccionElegida('');
    setDireccionBusqueda('');
    setResultadosDireccion([]);
    coordsDesdeDropdown.current = false;
  };

  const limpiarFormulario = () => {
<<<<<<< Updated upstream
    setFormulario({
      nombre: '',
      fechaInicio: '',
      ubicacion: '',
      descripcion: '',
      familiasAfectadas: '',
    });

=======
    setFormulario({ nombre: "", descripcion: "", lat: "", lng: "" });
    setDireccionBusqueda("");
    setDireccionElegida("");
    setResultadosDireccion([]);
>>>>>>> Stashed changes
    setEditandoId(null);
    coordsDesdeDropdown.current = false;
  };

  const mostrarExito = (msg) => {
    setExito(msg);
    setTimeout(() => setExito(""), 3500);
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editandoId) {
        await actualizarEmergencia(editandoId, formulario);
        mostrarExito("Emergencia actualizada correctamente.");
      } else {
<<<<<<< Updated upstream
        await crearEmergencia({
          ...formulario,
          estado: 'activa',
        });
=======
        await crearEmergencia({ ...formulario, estado: "activa" });
        mostrarExito("Emergencia registrada en el sistema.");
>>>>>>> Stashed changes
      }
      limpiarFormulario();
      cargarEmergencias();
    } catch {
      setError("No fue posible guardar la emergencia. Intente nuevamente.");
    }
  };

  const editarEmergencia = (emergencia) => {
<<<<<<< Updated upstream
    setFormulario({
      nombre: emergencia.nombre,
      fechaInicio: emergencia.fechaInicio?.split('T')[0],
      ubicacion: emergencia.ubicacion,
      descripcion: emergencia.descripcion,
      familiasAfectadas: emergencia.familiasAfectadas,
    });

    setEditandoId(emergencia._id || emergencia.id);
=======
    if (emergencia.estado === "finalizada") return;
    setFormulario({
      nombre: emergencia.nombre || "",
      descripcion: emergencia.descripcion || "",
      lat: emergencia.lat ? String(emergencia.lat) : "",
      lng: emergencia.lng ? String(emergencia.lng) : "",
    });
    setDireccionBusqueda("");
    setDireccionElegida(
      emergencia.lat && emergencia.lng
        ? `${Number(emergencia.lat).toFixed(6)}, ${Number(emergencia.lng).toFixed(6)}`
        : ""
    );
    setResultadosDireccion([]);
    setEditandoId(obtenerId(emergencia));
    window.scrollTo({ top: 0, behavior: "smooth" });
>>>>>>> Stashed changes
  };

  const finalizarEmergencia = async (id) => {
    if (!window.confirm("Confirma el cierre de esta emergencia? Esta accion no puede deshacerse.")) return;
    try {
      await cerrarEmergencia(id);
      cargarEmergencias();
      mostrarExito("Emergencia cerrada correctamente.");
    } catch {
      setError("No fue posible cerrar la emergencia.");
    }
  };

  const hayUbicacion = formulario.lat !== '' && formulario.lng !== '';
  const etiquetaEstado = { activa: "Activa", finalizada: "Finalizada" };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

<<<<<<< Updated upstream
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Gestión de Emergencias
        </h1>

        <form
          onSubmit={manejarSubmit}
          className="bg-white p-6 rounded-xl shadow grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <input type="text" name="nombre" placeholder="Nombre emergencia" value={formulario.nombre} onChange={manejarCambio} className="border rounded-lg px-4 py-2" required />
          <input type="date" name="fechaInicio" value={formulario.fechaInicio} onChange={manejarCambio} className="border rounded-lg px-4 py-2" required />
          <input type="text" name="ubicacion" placeholder="Ubicación" value={formulario.ubicacion} onChange={manejarCambio} className="border rounded-lg px-4 py-2" required />
          <input type="number" name="familiasAfectadas" placeholder="Familias afectadas" value={formulario.familiasAfectadas} onChange={manejarCambio} className="border rounded-lg px-4 py-2" required />
          <textarea name="descripcion" placeholder="Descripción" value={formulario.descripcion} onChange={manejarCambio} className="border rounded-lg px-4 py-2 col-span-full" rows="4" required />

          <button className="bg-red-600 text-white py-2 rounded-lg col-span-full">
            {editandoId ? 'Actualizar emergencia' : 'Crear emergencia'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-200 text-left">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Ubicación</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Familias</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {Array.isArray(emergencias) &&
                emergencias.map((emergencia) => (
                  <tr key={emergencia._id || emergencia.id} className="border-t">
                    <td className="p-3">{emergencia.nombre}</td>
                    <td className="p-3">{emergencia.ubicacion}</td>
                    <td className="p-3">{emergencia.estado}</td>
                    <td className="p-3">{emergencia.familiasAfectadas}</td>

                    <td className="p-3 flex gap-2">
                      <button onClick={() => editarEmergencia(emergencia)} className="bg-blue-600 text-white px-3 py-1 rounded">
                        Editar
                      </button>

                      {emergencia.estado === 'activa' && (
                        <button onClick={() => finalizarEmergencia(emergencia._id || emergencia.id)} className="bg-slate-800 text-white px-3 py-1 rounded">
                          Cerrar
                        </button>
=======
      <div className="pt-[60px]">
        {/* Encabezado de seccion */}
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Gestion de Emergencias
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Registro y administracion de emergencias activas del sistema
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Alertas de retroalimentacion */}
          {error && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-600 font-bold leading-none mt-0.5 bg-transparent border-none cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
          {exito && (
            <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {exito}
            </div>
          )}

          {/* Formulario de registro / edicion */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">

            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  {editandoId ? "Modificar emergencia" : "Registrar nueva emergencia"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editandoId
                    ? "Actualice los datos y confirme los cambios."
                    : "Complete los campos para incorporar una nueva emergencia al sistema."}
                </p>
              </div>
              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-3 py-1.5 transition-colors bg-white cursor-pointer"
                >
                  Cancelar edicion
                </button>
              )}
            </div>

            <form onSubmit={manejarSubmit} className="p-6 space-y-7">

              {/* SECCION 1: Datos de la emergencia */}
              <div>
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                  Datos de la emergencia
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Nombre <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      placeholder="Ej: Incendio Villa Las Flores, Sector Norte"
                      value={formulario.nombre}
                      onChange={manejarCambio}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-techo-primary focus:border-techo-primary placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Descripcion <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="descripcion"
                      placeholder="Describa la situacion, el area afectada y el tipo de intervencion requerida..."
                      value={formulario.descripcion}
                      onChange={manejarCambio}
                      required
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-techo-primary focus:border-techo-primary resize-vertical placeholder:text-gray-300"
                    />
                  </div>
                </div>
              </div>

              {/* SECCION 2: Localizacion */}
              <div>
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                  Localizacion
                </h3>

                {/* Busqueda predictiva */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Buscar por direccion
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={direccionBusqueda}
                      onChange={(e) => {
                        setDireccionBusqueda(e.target.value);
                        setDireccionElegida("");
                      }}
                      placeholder="Escriba la calle, numero y ciudad — ej: Pasaje Dieciocho 5235, Hualpen"
                      className="w-full border border-gray-300 rounded-md px-3 py-2.5 pr-28 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-techo-primary focus:border-techo-primary placeholder:text-gray-300"
                    />
                    {buscandoDireccion && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                        Buscando...
                      </span>
                    )}
                  </div>

                  {/* Lista de resultados predictivos */}
                  {resultadosDireccion.length > 0 && (
                    <div className="mt-1 border border-gray-200 rounded-md overflow-hidden shadow-sm">
                      <div className="bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        Seleccione la ubicacion correcta — {resultadosDireccion.length} resultado{resultadosDireccion.length > 1 ? "s" : ""}
                      </div>
                      {resultadosDireccion.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleElegirDireccion(r)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer"
                        >
                          <div className="text-sm font-medium text-gray-800">{r.etiqueta}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">
                            {r.lat.toFixed(6)}, {r.lng.toFixed(6)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mini-mapa: aparece cuando hay coordenadas confirmadas */}
                {hayUbicacion && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Ubicacion seleccionada
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        {parseFloat(formulario.lat).toFixed(5)}, {parseFloat(formulario.lng).toFixed(5)}
                      </span>
                    </div>

                    {/* Contenedor relativo: el boton "Limpiar" flota sobre el mapa con z-[1000] */}
                    <div
                      className="relative w-full rounded-md overflow-hidden border border-gray-200"
                      style={{ height: '280px', zIndex: 0 }}
                    >
                      <MapContainer
                        center={[parseFloat(formulario.lat), parseFloat(formulario.lng)]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />
                        <MiniMapaVolador
                          lat={formulario.lat}
                          lng={formulario.lng}
                          volarRef={coordsDesdeDropdown}
                        />
                        <Marker
                          position={[parseFloat(formulario.lat), parseFloat(formulario.lng)]}
                          icon={iconoMiniMapa}
                          draggable={true}
                          eventHandlers={{
                            dragend(e) {
                              const { lat, lng } = e.target.getLatLng();
                              setFormulario((f) => ({
                                ...f,
                                lat: lat.toFixed(6),
                                lng: lng.toFixed(6),
                              }));
                            },
                          }}
                        />
                      </MapContainer>

                      {/* Boton flotante sobre el mapa */}
                      <button
                        type="button"
                        onClick={limpiarUbicacion}
                        className="absolute top-2 right-2 z-[1000] px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 shadow-sm transition-colors cursor-pointer"
                      >
                        Limpiar ubicacion
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs text-gray-400">
                      Puede arrastrar el marcador para ajustar la posicion exacta.
                    </p>
                  </div>
                )}

                {/* Inputs manuales: solo cuando no hay mini-mapa activo */}
                {!hayUbicacion && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      O ingrese las coordenadas manualmente
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Latitud</label>
                        <input
                          type="number"
                          step="any"
                          name="lat"
                          placeholder="-36.820000"
                          value={formulario.lat}
                          onChange={manejarCambio}
                          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-techo-primary focus:border-techo-primary placeholder:text-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Longitud</label>
                        <input
                          type="number"
                          step="any"
                          name="lng"
                          placeholder="-73.050000"
                          value={formulario.lng}
                          onChange={manejarCambio}
                          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-techo-primary focus:border-techo-primary placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-400">
                      Busque la direccion arriba o ingrese las coordenadas para ver la ubicacion en el mapa.
                    </p>
                  </div>
                )}
              </div>

              {/* Accion principal */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-techo-primary text-white text-sm font-semibold rounded-md hover:bg-techo-dark transition-colors"
                >
                  {editandoId ? "Guardar cambios" : "Registrar emergencia"}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de emergencias registradas */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Emergencias registradas</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Coordenadas
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emergencias.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                      No hay emergencias registradas en el sistema.
                    </td>
                  </tr>
                )}
                {emergencias.map((emergencia) => (
                  <tr key={obtenerId(emergencia)} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {emergencia.nombre}
                    </td>
                    <td className="px-5 py-3.5">
                      {emergencia.lat && emergencia.lng ? (
                        <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                          {Number(emergencia.lat).toFixed(4)}, {Number(emergencia.lng).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Sin coordenadas</span>
>>>>>>> Stashed changes
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                        emergencia.estado === "activa"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {etiquetaEstado[emergencia.estado] || emergencia.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 justify-end">
                        {emergencia.estado === "activa" && (
                          <>
                            <button
                              onClick={() => editarEmergencia(emergencia)}
                              className="text-xs font-semibold px-3 py-1.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer bg-white"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => cargarFamilias(obtenerId(emergencia))}
                              className="text-xs font-semibold px-3 py-1.5 rounded border border-techo-primary text-techo-primary hover:bg-blue-50 transition-colors cursor-pointer bg-white"
                            >
                              Familias
                            </button>
                            <button
                              onClick={() => finalizarEmergencia(obtenerId(emergencia))}
                              className="text-xs font-semibold px-3 py-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                            >
                              Cerrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
<<<<<<< Updated upstream
            </tbody>
          </table>
=======
              </tbody>
            </table>
          </div>

          {/* Panel de familias afectadas */}
          {emergenciaSeleccionada && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Familias afectadas</h2>
              </div>
              {familias.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-400 text-center">
                  No hay familias registradas para esta emergencia.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Direccion</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Prioridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {familias.map((familia) => (
                      <tr key={familia.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-800">{familia.nombre_cabeza_familia}</td>
                        <td className="px-5 py-3 text-gray-500">{familia.direccion || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                            familia.prioridad === "alta"
                              ? "bg-red-100 text-red-700"
                              : familia.prioridad === "baja"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {familia.prioridad}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

>>>>>>> Stashed changes
        </div>
      </div>
    </div>
  );
}

export default GestionEmergencias;
