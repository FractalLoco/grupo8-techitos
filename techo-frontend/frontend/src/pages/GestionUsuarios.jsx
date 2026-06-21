import { useEffect, useMemo, useState } from "react";
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
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const usuariosPorPagina = 5;

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

  const normalizarTexto = (texto) => String(texto || "").toLowerCase().trim();

  const usuariosFiltrados = useMemo(() => {
    const textoBusqueda = normalizarTexto(busqueda);

    return usuarios.filter((usuario) => {
      const coincideBusqueda =
        normalizarTexto(usuario.nombre).includes(textoBusqueda) ||
        normalizarTexto(usuario.correo).includes(textoBusqueda) ||
        normalizarTexto(usuario.rut).includes(textoBusqueda) ||
        normalizarTexto(usuario.rol).includes(textoBusqueda);

      const coincideRol = filtroRol === "todos" || usuario.rol === filtroRol;

      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activo" && usuario.activo) ||
        (filtroEstado === "desactivado" && !usuario.activo);

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / usuariosPorPagina)
  );

  const usuariosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * usuariosPorPagina;
    const fin = inicio + usuariosPorPagina;

    return usuariosFiltrados.slice(inicio, fin);
  }, [usuariosFiltrados, paginaActual]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRol, filtroEstado]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroRol("todos");
    setFiltroEstado("todos");
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
          <div className="p-4 border-b grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo, RUT o rol"
              className="border rounded-lg px-4 py-2 md:col-span-2"
            />

            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="todos">Todos los roles</option>
              <option value="coordinador">Coordinador</option>
              <option value="jefe_cuadrilla">Jefe de cuadrilla</option>
              <option value="voluntario">Voluntario</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="desactivado">Desactivados</option>
            </select>

            <div className="md:col-span-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm text-gray-600">
              <span>
                Mostrando {usuariosPaginados.length} de {usuariosFiltrados.length} usuarios filtrados
              </span>

              <button
                type="button"
                onClick={limpiarFiltros}
                className="border rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Limpiar filtros
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
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
                {cargando && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan="5">
                      Cargando usuarios...
                    </td>
                  </tr>
                )}

                {!cargando && usuariosPaginados.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-gray-500" colSpan="5">
                      No se encontraron usuarios con los filtros seleccionados.
                    </td>
                  </tr>
                )}

                {!cargando &&
                  Array.isArray(usuariosPaginados) &&
                  usuariosPaginados.map((usuario) => (
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

          <div className="p-4 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <span className="text-sm text-gray-600">
              Página {paginaActual} de {totalPaginas}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaActual(1)}
                disabled={paginaActual === 1}
                className="border rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Primera
              </button>

              <button
                type="button"
                onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
                disabled={paginaActual === 1}
                className="border rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))
                }
                disabled={paginaActual === totalPaginas}
                className="border rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>

              <button
                type="button"
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaActual === totalPaginas}
                className="border rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Última
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionUsuarios;
