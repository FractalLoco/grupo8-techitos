import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Toast from "../components/ui/Toast";
import {
  MdAdd,
  MdBlock,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdEngineering,
  MdGroups,
  MdManageAccounts,
  MdPersonOff,
  MdRefresh,
  MdSearch,
  MdVolunteerActivism,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  activarUsuario,
  desactivarUsuario,
} from "../services/usuarioService";
import {
  formatearRutChileno,
  normalizarRutParaBackend,
} from "../utils/rut";

const FORMULARIO_INICIAL = {
  nombre: "",
  rut: "",
  correo: "",
  contrasena: "",
  rol: "voluntario",
};

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [mensajeError, setMensajeError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);

  const usuariosPorPagina = 8;

  const obtenerId = (usuario) => usuario._id || usuario.id;

  const mostrarMensajeExito = (titulo, descripcion) => {
    setMensajeError("");
    setMensajeExito({
      id: Date.now(),
      titulo,
      descripcion,
    });

    setTimeout(() => setMensajeExito(null), 4500);
  };

  const mostrarMensajeError = (mensaje) => {
    setMensajeExito(null);
    setMensajeError(mensaje);
    setTimeout(() => setMensajeError(""), 5000);
  };

  const cargarUsuarios = async ({ mostrarExito = false, actualizacionManual = false } = {}) => {
    try {
      if (actualizacionManual) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      const data = await obtenerUsuarios();
      let usuariosRecibidos = [];

      if (Array.isArray(data?.datos?.usuarios)) {
        usuariosRecibidos = data.datos.usuarios;
      } else if (Array.isArray(data?.datos)) {
        usuariosRecibidos = data.datos;
      } else if (Array.isArray(data)) {
        usuariosRecibidos = data;
      }

      setUsuarios(usuariosRecibidos);

      if (actualizacionManual) {
        // El backend ordena por creado_en DESC: volver a la primera página
        // hace visibles de inmediato los registros públicos más recientes.
        setPaginaActual(1);
      }

      if (mostrarExito) {
        mostrarMensajeExito(
          "¡Lista de usuarios actualizada!",
          "Los registros se han sincronizado correctamente con el servidor."
        );
      }

      return true;
    } catch (error) {
      console.error(error);

      // En una actualización manual conservamos la lista visible para no
      // borrar información útil por un fallo temporal de red.
      if (!actualizacionManual) {
        setUsuarios([]);
      }

      mostrarMensajeError(
        error.message || "No se pudieron cargar los usuarios."
      );
      return false;
    } finally {
      if (actualizacionManual) {
        setActualizando(false);
      } else {
        setCargando(false);
      }
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

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
        (filtroEstado === "activo" && Boolean(usuario.activo)) ||
        (filtroEstado === "desactivado" && !usuario.activo);

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  const estadisticas = useMemo(
    () => ({
      total: usuarios.length,
      voluntariosActivos: usuarios.filter(
        (usuario) => usuario.rol === "voluntario" && usuario.activo
      ).length,
      coordinadores: usuarios.filter((usuario) => usuario.rol === "coordinador").length,
      inactivos: usuarios.filter((usuario) => !usuario.activo).length,
    }),
    [usuarios]
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / usuariosPorPagina)
  );

  const usuariosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * usuariosPorPagina;
    return usuariosFiltrados.slice(inicio, inicio + usuariosPorPagina);
  }, [usuariosFiltrados, paginaActual]);

  const indiceInicial =
    usuariosFiltrados.length === 0
      ? 0
      : (paginaActual - 1) * usuariosPorPagina + 1;
  const indiceFinal = Math.min(
    paginaActual * usuariosPorPagina,
    usuariosFiltrados.length
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRol, filtroEstado]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    const valorProcesado =
      name === "rut" ? formatearRutChileno(value) : value;

    setFormulario((actual) => ({
      ...actual,
      [name]: valorProcesado,
    }));
  };

  const abrirNuevoUsuario = () => {
    setEditandoId(null);
    setMostrarContrasena(false);
    setFormulario(FORMULARIO_INICIAL);
    setMostrarFormulario(true);
  };

  const abrirEdicion = (usuario) => {
    setEditandoId(obtenerId(usuario));
    setMostrarContrasena(false);
    setFormulario({
      nombre: usuario.nombre || "",
      rut: formatearRutChileno(usuario.rut || ""),
      correo: usuario.correo || "",
      contrasena: "",
      rol: usuario.rol || "voluntario",
    });
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) return;
    setMostrarFormulario(false);
    setEditandoId(null);
    setMostrarContrasena(false);
    setFormulario(FORMULARIO_INICIAL);
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    try {
      setGuardando(true);

      if (editandoId) {
        const contrasena = formulario.contrasena.trim();

        if (contrasena && contrasena.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }

        const datosActualizacion = {
          nombre: formulario.nombre,
          rut: normalizarRutParaBackend(formulario.rut),
          correo: formulario.correo,
          rol: formulario.rol,
        };

        if (contrasena) {
          datosActualizacion.contrasena = contrasena;
        }

        await actualizarUsuario(editandoId, datosActualizacion);
        mostrarMensajeExito(
          "¡Cambios guardados con éxito!",
          contrasena
            ? "Los datos y la contraseña del usuario se han actualizado correctamente."
            : "El registro de usuario ha sido actualizado correctamente."
        );
      } else {
        const contrasena = formulario.contrasena.trim();

        if (contrasena.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        }

        await crearUsuario({
          nombre: formulario.nombre,
          rut: normalizarRutParaBackend(formulario.rut),
          correo: formulario.correo,
          contrasena,
          rol: formulario.rol,
        });
        mostrarMensajeExito(
          "¡Usuario creado!",
          "La cuenta se ha registrado y las credenciales fueron enviadas por correo."
        );
      }

      cerrarFormulario();
      await cargarUsuarios();
    } catch (error) {
      console.error(error);
      mostrarMensajeError(
        error.message ||
          (editandoId
            ? "No se pudo actualizar el usuario."
            : "No se pudo crear el usuario.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (usuario) => {
    try {
      const id = obtenerId(usuario);

      if (usuario.activo) {
        await desactivarUsuario(id);
        mostrarMensajeExito(
          "¡Usuario desactivado!",
          "La cuenta se ha desactivado correctamente."
        );
      } else {
        await activarUsuario(id);
        mostrarMensajeExito(
          "¡Usuario activado!",
          "La cuenta quedó activa sin cambiar su contraseña. Se envió una notificación por correo."
        );
      }

      await cargarUsuarios();
    } catch (error) {
      console.error(error);
      mostrarMensajeError(error.message || "No se pudo cambiar el estado del usuario.");
    }
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroRol("todos");
    setFiltroEstado("todos");
  };

  const formatearRol = (rol) => {
    const etiquetas = {
      coordinador: "Coordinador",
      jefe_cuadrilla: "Jefe de cuadrilla",
      voluntario: "Voluntario",
    };

    return etiquetas[rol] || rol || "Sin rol";
  };

  const obtenerIniciales = (nombre) => {
    const partes = String(nombre || "Usuario")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return partes
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("");
  };

  const obtenerClaseAvatar = (rol) => {
    if (rol === "coordinador") {
      return "bg-primary-container text-on-primary-container";
    }
    if (rol === "jefe_cuadrilla") {
      return "bg-secondary-container text-on-secondary-container";
    }
    return "bg-tertiary-container text-on-tertiary-container";
  };

  const numerosPagina = useMemo(() => {
    const paginas = [];
    const inicio = Math.max(1, paginaActual - 1);
    const fin = Math.min(totalPaginas, inicio + 2);

    for (let pagina = Math.max(1, fin - 2); pagina <= fin; pagina += 1) {
      paginas.push(pagina);
    }

    return paginas;
  }, [paginaActual, totalPaginas]);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-24 md:px-6 lg:px-8">
        <div
          className="mb-4 flex min-h-20 items-center justify-center py-2 pointer-events-none select-none"
          aria-label="Logo de TECHO Chile"
        >
          <img
            src="/logo-techo-color-oficial.svg"
            alt="TECHO Chile"
            className="h-14 w-auto object-contain animate-techo-logo-energetic"
          />
        </div>

        {mensajeExito && (
          <div
            key={mensajeExito.id}
            className="animate-audit-success-in mb-6 flex items-center justify-between gap-4 rounded-xl border border-green-600/20 bg-green-50 p-4 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex shrink-0 items-center justify-center rounded-full bg-green-600 p-1 text-white">
                <MdCheckCircle className="text-xl" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-green-600">
                  {mensajeExito.titulo}
                </p>
                <p className="mt-0.5 text-xs text-green-600/80">
                  {mensajeExito.descripcion}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMensajeExito(null)}
              className="shrink-0 rounded-full p-1 text-green-600 transition-colors hover:bg-green-600/10"
              aria-label="Cerrar mensaje de éxito"
            >
              <MdClose className="text-xl" />
            </button>
          </div>
        )}

        <section
          className="relative mb-10 h-36 overflow-hidden rounded-xl bg-cover bg-center shadow-sm md:h-48"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAo80V_uCD3JukUGlnLb7uyyClzBBUh42BHwKsNM--88PEGqiCbrYwN0mVy4Pt4LIA3vfz2w-x10ZMZBkDDDLoR8vPi_GZ_bu20F9sHBULxVErOO35vknrDk0zQMCPj8120LwIBf-Wh9tkrYlgFqACHWegCmeW4OreRrkTrH7DwvQ5Qxe2gPyILRzDhdHmPdNJ4WAptmHJGDy51eIuiQ0l7G5mfz7wiSpfonvE6oAW9zbkXYBRHvJ0g0E-tXMWfcvTU_m4Yn1wzwyZG')",
          }}
        >
          <div className="absolute inset-0 bg-primary/50" />
          <div className="absolute bottom-5 left-5 z-10 flex items-center gap-3 text-white md:bottom-6 md:left-6">
            <MdManageAccounts className="text-4xl" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                Administración central
              </p>
              <h1 className="text-2xl font-extrabold md:text-3xl">
                Gestión de Usuarios
              </h1>
            </div>
          </div>
        </section>

        {mensajeError && <Toast type="error" message={mensajeError} />}

        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="flex min-h-32 flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <span className="text-sm text-on-surface-variant">Total usuarios</span>
            <div className="mt-2 flex items-end justify-between">
              <strong className="text-3xl font-bold text-primary">
                {estadisticas.total}
              </strong>
              <MdGroups className="text-3xl text-primary-fixed-dim" />
            </div>
          </article>

          <article className="flex min-h-32 flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <span className="text-sm text-on-surface-variant">
              Voluntarios activos
            </span>
            <div className="mt-2 flex items-end justify-between">
              <strong className="text-3xl font-bold text-tertiary">
                {estadisticas.voluntariosActivos}
              </strong>
              <MdVolunteerActivism className="text-3xl text-tertiary-fixed-dim" />
            </div>
          </article>

          <article className="flex min-h-32 flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <span className="text-sm text-on-surface-variant">Coordinadores</span>
            <div className="mt-2 flex items-end justify-between">
              <strong className="text-3xl font-bold text-primary">
                {estadisticas.coordinadores}
              </strong>
              <MdEngineering className="text-3xl text-primary-fixed-dim" />
            </div>
          </article>

          <article className="flex min-h-32 flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <span className="text-sm text-on-surface-variant">Usuarios inactivos</span>
            <div className="mt-2 flex items-end justify-between">
              <strong className="text-3xl font-bold text-error">
                {estadisticas.inactivos}
              </strong>
              <MdPersonOff className="text-3xl text-secondary-fixed-dim" />
            </div>
          </article>
        </section>

        <section className="mb-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 md:flex-row">
              <label className="relative w-full md:max-w-sm">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, RUT o correo..."
                  className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-4 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>

              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface-variant outline-none focus:border-primary md:w-52"
              >
                <option value="todos">Todos los roles</option>
                <option value="voluntario">Voluntario</option>
                <option value="jefe_cuadrilla">Jefe de cuadrilla</option>
                <option value="coordinador">Coordinador</option>
              </select>

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface-variant outline-none focus:border-primary md:w-48"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="desactivado">Inactivo</option>
              </select>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <button
                type="button"
                onClick={() =>
                  cargarUsuarios({
                    mostrarExito: true,
                    actualizacionManual: true,
                  })
                }
                disabled={actualizando || cargando}
                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                aria-label="Actualizar lista de usuarios"
              >
                <MdRefresh
                  className={`text-xl ${actualizando ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {actualizando ? "Actualizando..." : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={abrirNuevoUsuario}
                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-sm transition hover:bg-primary-dark sm:w-auto"
              >
                <MdAdd className="text-xl" />
                Nuevo usuario
              </button>
            </div>
          </div>

          {(busqueda || filtroRol !== "todos" || filtroEstado !== "todos") && (
            <div className="mt-4 flex flex-col gap-3 border-t border-outline-variant pt-4 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
              <span>
                {usuariosFiltrados.length} resultado
                {usuariosFiltrados.length === 1 ? "" : "s"} encontrado
                {usuariosFiltrados.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2 font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
              >
                <MdRefresh />
                Limpiar filtros
              </button>
            </div>
          )}
        </section>

        <section className="mb-4">
          {cargando && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-on-surface-variant shadow-sm">
              Cargando usuarios...
            </div>
          )}

          {!cargando && usuariosPaginados.length === 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-on-surface-variant shadow-sm">
              No se encontraron usuarios con los filtros seleccionados.
            </div>
          )}

          {!cargando && usuariosPaginados.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {usuariosPaginados.map((usuario) => {
                const activo = Boolean(usuario.activo);

                return (
                  <article
                    key={obtenerId(usuario)}
                    className={`group relative flex min-h-[245px] flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      activo ? "" : "bg-surface-container-low/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                          activo
                            ? obtenerClaseAvatar(usuario.rol)
                            : "bg-surface-variant text-on-surface-variant"
                        }`}
                        aria-hidden="true"
                      >
                        {obtenerIniciales(usuario.nombre)}
                      </div>

                      <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(usuario)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
                          title="Editar usuario"
                          aria-label={`Editar a ${usuario.nombre}`}
                        >
                          <MdEdit className="text-lg" />
                        </button>

                        <button
                          type="button"
                          onClick={() => cambiarEstado(usuario)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface-container transition-colors ${
                            activo
                              ? "text-error hover:bg-error-container"
                              : "text-primary hover:bg-primary-fixed"
                          }`}
                          title={activo ? "Desactivar usuario" : "Activar usuario"}
                          aria-label={`${activo ? "Desactivar" : "Activar"} a ${
                            usuario.nombre
                          }`}
                        >
                          {activo ? (
                            <MdBlock className="text-lg" />
                          ) : (
                            <MdRefresh className="text-lg" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={activo ? "" : "opacity-60"}>
                      <h3 className="mb-1 truncate text-lg font-bold text-on-surface">
                        {usuario.nombre || "Usuario sin nombre"}
                      </h3>
                      <p
                        className="mb-1 truncate text-sm text-on-surface-variant"
                        title={usuario.correo || ""}
                      >
                        {usuario.correo || "Sin correo"}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {usuario.rut || "Sin RUT"}
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
                      <span
                        className={`min-w-0 truncate text-sm font-medium text-on-surface ${
                          activo ? "" : "opacity-60"
                        }`}
                        title={formatearRol(usuario.rol)}
                      >
                        {formatearRol(usuario.rol)}
                      </span>

                      {activo ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-primary-fixed-variant">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-variant px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                          <span className="h-1.5 w-1.5 rounded-full bg-outline" />
                          Inactivo
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-on-surface-variant">
            Mostrando {indiceInicial} - {indiceFinal} de {usuariosFiltrados.length}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))}
              disabled={paginaActual === 1}
              className="rounded-md border border-outline-variant px-3 py-1.5 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            {numerosPagina.map((pagina) => (
              <button
                key={pagina}
                type="button"
                onClick={() => setPaginaActual(pagina)}
                className={`min-w-9 rounded-md border px-3 py-1.5 text-sm font-bold transition ${
                  paginaActual === pagina
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                }`}
                aria-current={paginaActual === pagina ? "page" : undefined}
              >
                {pagina}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))
              }
              disabled={paginaActual === totalPaginas}
              className="rounded-md border border-outline-variant px-3 py-1.5 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </section>
      </main>

      {mostrarFormulario && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-formulario-usuario"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cerrarFormulario();
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  {editandoId ? "Actualización de cuenta" : "Registro de cuenta"}
                </p>
                <h2
                  id="titulo-formulario-usuario"
                  className="mt-1 text-xl font-bold text-on-surface"
                >
                  {editandoId ? "Editar usuario" : "Nuevo usuario"}
                </h2>
              </div>
              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
                className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high disabled:opacity-50"
                aria-label="Cerrar formulario"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            <form onSubmit={manejarSubmit} className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-on-surface">
                    Nombre completo
                  </span>
                  <input
                    type="text"
                    name="nombre"
                    value={formulario.nombre}
                    onChange={manejarCambio}
                    placeholder="Ej. María Valenzuela"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-sm font-semibold text-on-surface">
                    RUT
                  </span>
                  <input
                    type="text"
                    name="rut"
                    value={formulario.rut}
                    onChange={manejarCambio}
                    placeholder="12.345.678-9"
                    maxLength={12}
                    inputMode="text"
                    autoComplete="off"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-sm font-semibold text-on-surface">
                    Rol
                  </span>
                  <select
                    name="rol"
                    value={formulario.rol}
                    onChange={manejarCambio}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="coordinador">Coordinador</option>
                    <option value="jefe_cuadrilla">Jefe de cuadrilla</option>
                    <option value="voluntario">Voluntario</option>
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-on-surface">
                    Correo electrónico
                  </span>
                  <input
                    type="email"
                    name="correo"
                    value={formulario.correo}
                    onChange={manejarCambio}
                    placeholder="usuario@ejemplo.cl"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-sm font-semibold text-on-surface">
                    {editandoId ? "Nueva contraseña" : "Contraseña"}
                    {editandoId && (
                      <span className="ml-1 font-normal text-on-surface-variant">
                        (opcional)
                      </span>
                    )}
                  </span>
                  <div className="relative">
                    <input
                      type={mostrarContrasena ? "text" : "password"}
                      name="contrasena"
                      value={formulario.contrasena}
                      onChange={manejarCambio}
                      placeholder={
                        editandoId
                          ? "Déjala vacía para conservar la actual"
                          : "Mínimo 6 caracteres"
                      }
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-2.5 pr-12 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                      required={!editandoId}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarContrasena((visible) => !visible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-high"
                      aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {mostrarContrasena ? (
                        <MdVisibilityOff className="text-xl" />
                      ) : (
                        <MdVisibility className="text-xl" />
                      )}
                    </button>
                  </div>
                  <span className="mt-1.5 block text-xs text-on-surface-variant">
                    {editandoId
                      ? "Escribe una nueva contraseña para reemplazar la actual. Si el usuario quedó sin contraseña, úsala para definir una."
                      : "Esta contraseña se guardará cifrada y se enviará al correo del usuario."}
                  </span>
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                  className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-low disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editandoId ? <MdEdit className="text-lg" /> : <MdAdd className="text-lg" />}
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionUsuarios;
