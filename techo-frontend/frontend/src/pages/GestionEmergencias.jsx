import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

import {
  obtenerEmergencias,
  crearEmergencia,
  actualizarEmergencia,
  cerrarEmergencia,
} from "../services/emergenciaService";

function GestionEmergencias() {
  const [emergencias, setEmergencias] = useState([]);

  const [formulario, setFormulario] = useState({
    nombre: "",
    descripcion: "",
    lat: "",
    lng: "",
  });

  const [familias, setFamilias] = useState([]);

  const [emergenciaSeleccionada, setEmergenciaSeleccionada] = useState(null);

  const cargarFamilias = async (id) => {
    try {
      const data = await obtenerFamilias(id);

      setFamilias(data?.datos?.familias || []);

      setEmergenciaSeleccionada(id);
    } catch (error) {
      console.error(error);
    }
  };

  const [editandoId, setEditandoId] = useState(null);

  const obtenerId = (emergencia) => emergencia._id || emergencia.id;

  async function cargarEmergencias() {
    try {
      const data = await obtenerEmergencias();

      const lista = data?.datos?.emergencias || data?.datos || data || [];

      /* console.log("Emergencias recibidas:", lista); */

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

  useEffect(() => {
    cargarEmergencias();
  }, []);

  const manejarCambio = (e) => {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value,
    });
  };

  const limpiarFormulario = () => {
    setFormulario({
      nombre: "",
      descripcion: "",
      lat: "",
      lng: "",
    });

    setEditandoId(null);
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editandoId) {
        await actualizarEmergencia(editandoId, formulario);
      } else {
        await crearEmergencia({
          ...formulario,
          estado: "activa",
        });
      }

      limpiarFormulario();
      cargarEmergencias();
    } catch (error) {
      console.error(error);
    }
  };

  const editarEmergencia = (emergencia) => {
    if (emergencia.estado === "finalizada") {
      return;
    }

    setFormulario({
      nombre: emergencia.nombre || "",

      descripcion: emergencia.descripcion || "",

      lat: emergencia.lat || "",

      lng: emergencia.lng || "",
    });

    setEditandoId(obtenerId(emergencia));
  };

  const finalizarEmergencia = async (id) => {
    try {
      await cerrarEmergencia(id);

      cargarEmergencias();
    } catch (error) {
      console.error(error);
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
                <th className="p-3">Nombre</th>

                <th className="p-3">Estado</th>

                <th className="p-3">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {Array.isArray(emergencias) &&
                emergencias.map(
                  (emergencia) => (
                    /* console.log(emergencia), */
                    (
                      <tr key={obtenerId(emergencia)} className="border-t">
                        <td className="p-3">{emergencia.nombre}</td>

                        <td className="p-3">{emergencia.estado}</td>

                        <td className="p-3 flex gap-2">
                          {emergencia.estado === "activa" && (
                            <>
                              <button
                                onClick={() => editarEmergencia(emergencia)}
                                className="bg-blue-600 text-white px-3 py-1 rounded"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() =>
                                  cargarFamilias(obtenerId(emergencia))
                                }
                                className="bg-green-600 text-white px-3 py-1 rounded"
                              >
                                Familias
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
                    )
                  ),
                )}
            </tbody>
          </table>
          {familias.length > 0 && (
            <div className="mt-8 bg-white rounded-xl p-4">
              <h2 className="text-xl font-bold mb-4">Familias afectadas</h2>

              <table className="w-full">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Dirección</th>
                    <th>Prioridad</th>
                  </tr>
                </thead>

                <tbody>
                  {familias.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nombre_cabeza_familia}</td>

                      <td>{f.direccion}</td>

                      <td>{f.prioridad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GestionEmergencias;
