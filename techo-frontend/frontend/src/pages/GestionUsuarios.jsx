import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  obtenerUsuarios,
  crearUsuario,
  activarUsuario,
  desactivarUsuario,
} from "../services/usuarioService";

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [formulario, setFormulario] = useState({
    nombre: "",
    rut: "",
    correo: "",
    rol: "voluntario",
  });

  // Obtiene id compatible con MongoDB o SQL
  const obtenerId = (usuario) => usuario._id || usuario.id;

  const cargarUsuarios = async () => {
    try {
      setCargando(true);

      const data = await obtenerUsuarios();

      if (Array.isArray(data?.datos?.usuarios)) {
        setUsuarios(data.datos.usuarios);
      } else {
        setUsuarios([]);
      }
    } catch (error) {
      console.error(error);
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const manejarCambio = (e) => {
    setFormulario({
      ...formulario,
      [e.target.name]: e.target.value,
    });
  };

  // Crear usuario con manejo de errores
  const manejarSubmit = async (e) => {
    e.preventDefault();

    try {
      await crearUsuario(formulario);

      setFormulario({
        nombre: "",
        rut: "",
        correo: "",
        rol: "voluntario",
      });

      cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  // Activar o desactivar usuario
  const cambiarEstado = async (usuario) => {
    try {
      const id = obtenerId(usuario);

      if (usuario.activo) {
        await desactivarUsuario(id);
      } else {
        await activarUsuario(id);
      }

      cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="pt-24 px-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Gestión de Usuarios</h1>

        <form
          onSubmit={manejarSubmit}
          className="bg-white p-6 rounded-xl shadow mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            value={formulario.nombre}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
            required
          />

          <input
            type="text"
            name="rut"
            placeholder="RUT"
            value={formulario.rut}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
            required
          />

          <input
            type="email"
            name="correo"
            placeholder="Correo"
            value={formulario.correo}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
            required
          />

          <select
            name="rol"
            value={formulario.rol}
            onChange={manejarCambio}
            className="border rounded-lg px-4 py-2"
          >
            <option value="coordinador">Coordinador</option>

            <option value="jefe_cuadrilla">Jefe de cuadrilla</option>

            <option value="voluntario">Voluntario</option>
          </select>

          <button className="bg-blue-600 text-white rounded-lg py-2 px-4 col-span-full">
            Crear usuario
          </button>
        </form>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-200 text-left">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Acción</th>
              </tr>
            </thead>

            <tbody>
              {!cargando &&
                Array.isArray(usuarios) &&
                usuarios.map((usuario) => (
                  <tr key={obtenerId(usuario)} className="border-t">
                    <td className="p-3">{usuario.nombre}</td>

                    <td className="p-3">{usuario.correo}</td>

                    <td className="p-3">{usuario.rol}</td>

                    <td className="p-3">
                      {usuario.activo ? "Activo" : "Desactivado"}
                    </td>

                    <td className="p-3">
                      <button
                        onClick={() => cambiarEstado(usuario)}
                        className="bg-slate-800 text-white px-3 py-1 rounded"
                      >
                        {usuario.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GestionUsuarios;
