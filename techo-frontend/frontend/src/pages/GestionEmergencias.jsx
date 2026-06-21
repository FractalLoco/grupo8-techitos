import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

import {
  obtenerEmergencias,
  crearEmergencia,
  actualizarEmergencia,
  cerrarEmergencia,
  obtenerFamilias,
  registrarFamilia,
} from "../services/emergenciaService";

function GestionEmergencias() {
  const [emergencias, setEmergencias] = useState([]);

  const [formulario, setFormulario] = useState({
    nombre: "",
    descripcion: "",
    direccion: "",
    lat: "",
    lng: "",
  });

  const [familias, setFamilias] = useState([]);
  const [emergenciaSeleccionada, setEmergenciaSeleccionada] = useState(null);
  const [mostrarModalFamilia, setMostrarModalFamilia] = useState(false);
  const [formularioFamilia, setFormularioFamilia] = useState({
    nombre_cabeza_familia: "",
    direccion: "",
    lat: "",
    lng: "",
    miembros: 1,
    prioridad: "normal",
  });

  const [editandoId, setEditandoId] = useState(null);

  const obtenerId = (emergencia) => emergencia._id || emergencia.id;

  const normalizarListaFamilias = (data) =>
    data?.datos?.familias || data?.familias || data?.data || [];

  async function cargarEmergencias() {
    try {
      const data = await obtenerEmergencias();
      const lista = data?.datos?.emergencias || data?.datos || data || [];

      if (Array.isArray(lista)) {
        setEmergencias(lista);
      } else {
        setEmergencias([]);
      }
    } catch (error) {
      console.error(error);
      setEmergencias([]);
    }
  }

  const cargarFamilias = async (emergencia) => {
    const id = obtenerId(emergencia);

    try {
      setEmergenciaSeleccionada(emergencia);
      const data = await obtenerFamilias(id);
      setFamilias(normalizarListaFamilias(data));
    } catch (error) {
      console.error(error);
      setFamilias([]);
    }
  };

  useEffect(() => {
    cargarEmergencias();
  }, []);

  const manejarCambio = (e) => {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value,
    });
  };

  const manejarCambioFamilia = (e) => {
    setFormularioFamilia({
      ...formularioFamilia,
      [e.target.name]: e.target.value,
    });
  };

  const limpiarFormulario = () => {
    setFormulario({
      nombre: "",
      descripcion: "",
      direccion: "",
      lat: "",
      lng: "",
    });

    setEditandoId(null);
  };

  const limpiarFormularioFamilia = () => {
    setFormularioFamilia({
      nombre_cabeza_familia: "",
      direccion: "",
      lat: "",
      lng: "",
      miembros: 1,
      prioridad: "normal",
    });
  };

  const prepararDatosEmergencia = () => ({
    nombre: formulario.nombre,
    descripcion: formulario.descripcion,
    direccion: formulario.direccion === "" ? null : formulario.direccion,
    lat: formulario.lat === "" ? null : Number(formulario.lat),
    lng: formulario.lng === "" ? null : Number(formulario.lng),
  });

  const manejarSubmit = async (e) => {
    e.preventDefault();

    try {
      const datos = prepararDatosEmergencia();

      if (editandoId) {
        await actualizarEmergencia(editandoId, datos);
      } else {
        await crearEmergencia({
          ...datos,
          estado: "activa",
        });
      }

      limpiarFormulario();
      cargarEmergencias();
    } catch (error) {
      console.error(error.response?.data || error);
    }
  };

  const editarEmergencia = (emergencia) => {
    if (emergencia.estado === "finalizada") {
      return;
    }

    setFormulario({
      nombre: emergencia.nombre || "",
      descripcion: emergencia.descripcion || "",
      direccion: emergencia.direccion || "",
      lat: emergencia.lat ?? "",
      lng: emergencia.lng ?? "",
    });

    setEditandoId(obtenerId(emergencia));
  };

  const finalizarEmergencia = async (id) => {
    try {
      await cerrarEmergencia(id);
      cargarEmergencias();
    } catch (error) {
      console.error(error.response?.data || error);
    }
  };

  const abrirModalFamilia = async (emergencia) => {
    setEmergenciaSeleccionada(emergencia);
    limpiarFormularioFamilia();
    setMostrarModalFamilia(true);
    await cargarFamilias(emergencia);
  };

  const cerrarModalFamilia = () => {
    setMostrarModalFamilia(false);
    limpiarFormularioFamilia();
  };

  const manejarSubmitFamilia = async (e) => {
    e.preventDefault();

    if (!emergenciaSeleccionada) return;

    try {
      const datosFamilia = {
        nombre_cabeza_familia: formularioFamilia.nombre_cabeza_familia,
        direccion:
          formularioFamilia.direccion === "" ? null : formularioFamilia.direccion,
        lat: formularioFamilia.lat === "" ? null : Number(formularioFamilia.lat),
        lng: formularioFamilia.lng === "" ? null : Number(formularioFamilia.lng),
        miembros: Number(formularioFamilia.miembros) || 1,
        prioridad: formularioFamilia.prioridad,
      };

      await registrarFamilia(obtenerId(emergenciaSeleccionada), datosFamilia);
      await cargarFamilias(emergenciaSeleccionada);
      cerrarModalFamilia();
    } catch (error) {
      console.error(error.response?.data || error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Gestión de Emergencias</h1>

        <form
          onSubmit={manejarSubmit}
          className="bg-white p-6 rounded-xl shadow grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
        >
          <input
            type="text"
            name="nombre"
            placeholder="Nombre emergencia"
            value={formulario.nombre}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
            required
          />

          <input
            type="text"
            name="direccion"
            placeholder="Dirección de la emergencia"
            value={formulario.direccion}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
          />

          <input
            type="number"
            step="any"
            name="lat"
            placeholder="Latitud"
            value={formulario.lat}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
          />

          <input
            type="number"
            step="any"
            name="lng"
            placeholder="Longitud"
            value={formulario.lng}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
          />

          <textarea
            name="descripcion"
            placeholder="Descripción"
            value={formulario.descripcion}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2 col-span-full"
            rows="4"
            required
          />

          <button className="bg-red-600 text-white py-2 rounded-lg col-span-full">
            {editandoId ? "Actualizar emergencia" : "Crear emergencia"}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Dirección</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {Array.isArray(emergencias) &&
                emergencias.map((emergencia) => (
                  <tr key={obtenerId(emergencia)} className="border-t">
                    <td className="p-3">{emergencia.nombre}</td>
                    <td className="p-3 text-gray-600">
                      {emergencia.direccion || "Sin dirección"}
                    </td>
                    <td className="p-3">{emergencia.estado}</td>

                    <td className="p-3 flex flex-wrap gap-2">
                      {emergencia.estado === "activa" && (
                        <>
                          <button
                            onClick={() => editarEmergencia(emergencia)}
                            className="bg-blue-600 text-white px-3 py-1 rounded"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => cargarFamilias(emergencia)}
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Ver familias
                          </button>

                          <button
                            onClick={() => abrirModalFamilia(emergencia)}
                            className="bg-emerald-600 text-white px-3 py-1 rounded"
                          >
                            Agregar familia
                          </button>

                          <button
                            onClick={() =>
                              finalizarEmergencia(obtenerId(emergencia))
                            }
                            className="bg-slate-800 text-white px-3 py-1 rounded"
                          >
                            Cerrar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow p-4">
          <h2 className="text-xl font-bold mb-1">Familias afectadas</h2>
          <p className="text-sm text-gray-500 mb-4">
            {emergenciaSeleccionada
              ? `Emergencia seleccionada: ${emergenciaSeleccionada.nombre}`
              : "Selecciona una emergencia para ver sus familias"}
          </p>

          {familias.length === 0 ? (
            <p className="text-gray-500">
              No hay familias registradas para esta emergencia
            </p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-3 text-left">Nombre</th>
                  <th className="p-3 text-left">Dirección</th>
                  <th className="p-3 text-left">Miembros</th>
                  <th className="p-3 text-left">Prioridad</th>
                </tr>
              </thead>

              <tbody>
                {familias.map((familia) => (
                  <tr key={familia.id} className="border-t">
                    <td className="p-3">{familia.nombre_cabeza_familia}</td>
                    <td className="p-3">{familia.direccion || "Sin dirección"}</td>
                    <td className="p-3">{familia.miembros}</td>
                    <td className="p-3 capitalize">{familia.prioridad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {mostrarModalFamilia && emergenciaSeleccionada && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h2 className="text-xl font-bold">
                Agregar familia a {emergenciaSeleccionada.nombre}
              </h2>
              <button
                type="button"
                onClick={cerrarModalFamilia}
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={manejarSubmitFamilia}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <input
                type="text"
                name="nombre_cabeza_familia"
                placeholder="Nombre jefe/a de familia"
                value={formularioFamilia.nombre_cabeza_familia}
                onChange={manejarCambioFamilia}
                className="border rounded-lg px-4 py-2 col-span-full"
                required
              />

              <input
                type="text"
                name="direccion"
                placeholder="Dirección de la familia"
                value={formularioFamilia.direccion}
                onChange={manejarCambioFamilia}
                className="border rounded-lg px-4 py-2 col-span-full"
              />

              <input
                type="number"
                step="any"
                name="lat"
                placeholder="Latitud"
                value={formularioFamilia.lat}
                onChange={manejarCambioFamilia}
                className="border rounded-lg px-4 py-2"
              />

              <input
                type="number"
                step="any"
                name="lng"
                placeholder="Longitud"
                value={formularioFamilia.lng}
                onChange={manejarCambioFamilia}
                className="border rounded-lg px-4 py-2"
              />

              <input
                type="number"
                min="1"
                name="miembros"
                placeholder="Cantidad de miembros"
                value={formularioFamilia.miembros}
                onChange={manejarCambioFamilia}
                className="border rounded-lg px-4 py-2"
              />

              <select
                name="prioridad"
                value={formularioFamilia.prioridad}
                onChange={manejarCambioFamilia}
                className="border rounded-lg px-4 py-2"
              >
                <option value="alta">Alta</option>
                <option value="normal">Normal</option>
                <option value="baja">Baja</option>
              </select>

              <div className="col-span-full flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModalFamilia}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
                >
                  Guardar familia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionEmergencias;
