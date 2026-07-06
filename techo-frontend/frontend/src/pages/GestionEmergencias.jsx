import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import {
  MdAdd,
  MdBarChart,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdFamilyRestroom,
  MdGroups,
  MdHourglassTop,
  MdLocationOn,
  MdSearch,
  MdWarningAmber,
} from "react-icons/md";

import {
  obtenerEmergencias,
  crearEmergencia,
  actualizarEmergencia,
  cerrarEmergencia,
  obtenerFamilias,
  registrarFamilia,
} from "../services/emergenciaService";
import {
  buscarDireccionesMultiples,
  geocodificarDireccion,
} from "../services/mapaService";

function GestionEmergencias() {
  const [emergencias, setEmergencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [busquedaEmergencia, setBusquedaEmergencia] = useState("");
  const [filtroEstadoEmergencia, setFiltroEstadoEmergencia] = useState("todos");
  const [paginaActualEmergencias, setPaginaActualEmergencias] = useState(1);
  const emergenciasPorPagina = 5;

  const [formulario, setFormulario] = useState({
    nombre: "",
    descripcion: "",
    direccion: "",
    lat: "",
    lng: "",
  });
  const [resultadosDireccion, setResultadosDireccion] = useState([]);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(false);
  const [busquedaDireccionRealizada, setBusquedaDireccionRealizada] = useState(false);
  const [indiceDireccionActiva, setIndiceDireccionActiva] = useState(-1);
  const contenedorDireccionRef = useRef(null);

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
  const [resultadosDireccionFamilia, setResultadosDireccionFamilia] = useState([]);
  const [buscandoDireccionFamilia, setBuscandoDireccionFamilia] = useState(false);
  const [direccionFamiliaSeleccionada, setDireccionFamiliaSeleccionada] = useState(false);
  const [busquedaDireccionFamiliaRealizada, setBusquedaDireccionFamiliaRealizada] = useState(false);
  const [indiceDireccionFamiliaActiva, setIndiceDireccionFamiliaActiva] = useState(-1);
  const contenedorDireccionFamiliaRef = useRef(null);

  const [editandoId, setEditandoId] = useState(null);
  const [mostrarFormularioEmergencia, setMostrarFormularioEmergencia] = useState(false);

  const obtenerId = (emergencia) => emergencia._id || emergencia.id;

  const normalizarListaFamilias = (data) =>
    data?.datos?.familias || data?.familias || data?.data || [];

  const normalizarTexto = (texto) => String(texto || "").toLowerCase().trim();

  const mostrarMensajeExito = (mensaje) => {
    setMensajeError("");
    setMensajeExito(mensaje);
    setTimeout(() => setMensajeExito(""), 3500);
  };

  const mostrarMensajeError = (mensaje) => {
    setMensajeExito("");
    setMensajeError(mensaje);
    setTimeout(() => setMensajeError(""), 5000);
  };

  async function cargarEmergencias() {
    try {
      setCargando(true);
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
      mostrarMensajeError("No se pudieron cargar las emergencias.");
    } finally {
      setCargando(false);
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
      mostrarMensajeError("No se pudieron cargar las familias de la emergencia.");
    }
  };

  useEffect(() => {
    cargarEmergencias();
  }, []);

  const emergenciasFiltradas = useMemo(() => {
    const textoBusqueda = normalizarTexto(busquedaEmergencia);

    return emergencias.filter((emergencia) => {
      const coincideBusqueda =
        normalizarTexto(emergencia.nombre).includes(textoBusqueda) ||
        normalizarTexto(emergencia.descripcion).includes(textoBusqueda) ||
        normalizarTexto(emergencia.direccion).includes(textoBusqueda) ||
        normalizarTexto(emergencia.estado).includes(textoBusqueda);

      const coincideEstado =
        filtroEstadoEmergencia === "todos" ||
        emergencia.estado === filtroEstadoEmergencia;

      return coincideBusqueda && coincideEstado;
    });
  }, [emergencias, busquedaEmergencia, filtroEstadoEmergencia]);

  const totalPaginasEmergencias = Math.max(
    1,
    Math.ceil(emergenciasFiltradas.length / emergenciasPorPagina)
  );

  const emergenciasPaginadas = useMemo(() => {
    const inicio = (paginaActualEmergencias - 1) * emergenciasPorPagina;
    const fin = inicio + emergenciasPorPagina;

    return emergenciasFiltradas.slice(inicio, fin);
  }, [emergenciasFiltradas, paginaActualEmergencias]);

  useEffect(() => {
    setPaginaActualEmergencias(1);
  }, [busquedaEmergencia, filtroEstadoEmergencia]);

  useEffect(() => {
    if (paginaActualEmergencias > totalPaginasEmergencias) {
      setPaginaActualEmergencias(totalPaginasEmergencias);
    }
  }, [paginaActualEmergencias, totalPaginasEmergencias]);

  const limpiarFiltrosEmergencias = () => {
    setBusquedaEmergencia("");
    setFiltroEstadoEmergencia("todos");
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    if (name === "direccion") {
      // Al editar el texto invalidamos las coordenadas anteriores para evitar
      // guardar una ubicación que ya no corresponde a la dirección visible.
      setDireccionSeleccionada(false);
      setResultadosDireccion([]);
      setBusquedaDireccionRealizada(false);
      setIndiceDireccionActiva(-1);
      setFormulario((actual) => ({
        ...actual,
        direccion: value,
        lat: "",
        lng: "",
      }));
      return;
    }

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  // Predicción de direcciones: reutiliza la misma búsqueda Photon/OpenStreetMap
  // que ya usa el módulo de mapa del proyecto. Espera 300 ms para evitar
  // consultas excesivas y despliega resultados enriquecidos y navegables.
  useEffect(() => {
    const texto = formulario.direccion.trim();

    if (direccionSeleccionada || texto.length < 3) {
      setResultadosDireccion([]);
      setBuscandoDireccion(false);
      setBusquedaDireccionRealizada(false);
      setIndiceDireccionActiva(-1);
      return undefined;
    }

    let cancelado = false;
    setBuscandoDireccion(true);
    setBusquedaDireccionRealizada(false);
    setIndiceDireccionActiva(-1);

    const timer = setTimeout(async () => {
      try {
        const resultados = await buscarDireccionesMultiples(texto);
        if (!cancelado) {
          setResultadosDireccion(resultados);
          setBusquedaDireccionRealizada(true);
        }
      } catch (error) {
        console.error("Error buscando direcciones:", error);
        if (!cancelado) {
          setResultadosDireccion([]);
          setBusquedaDireccionRealizada(true);
        }
      } finally {
        if (!cancelado) {
          setBuscandoDireccion(false);
        }
      }
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [formulario.direccion, direccionSeleccionada]);

  // Cierra el panel de sugerencias al hacer clic fuera del campo.
  useEffect(() => {
    const cerrarAlHacerClicFuera = (event) => {
      if (
        contenedorDireccionRef.current &&
        !contenedorDireccionRef.current.contains(event.target)
      ) {
        setResultadosDireccion([]);
        setBusquedaDireccionRealizada(false);
        setIndiceDireccionActiva(-1);
      }
    };

    document.addEventListener("mousedown", cerrarAlHacerClicFuera);
    return () => document.removeEventListener("mousedown", cerrarAlHacerClicFuera);
  }, []);

  const seleccionarDireccion = (resultado) => {
    setFormulario((actual) => ({
      ...actual,
      direccion: resultado.etiqueta,
      lat: Number(resultado.lat),
      lng: Number(resultado.lng),
    }));
    setDireccionSeleccionada(true);
    setResultadosDireccion([]);
    setBuscandoDireccion(false);
    setBusquedaDireccionRealizada(false);
    setIndiceDireccionActiva(-1);
  };

  const manejarTeclaDireccion = (e) => {
    if (e.key === "Escape") {
      setResultadosDireccion([]);
      setBusquedaDireccionRealizada(false);
      setIndiceDireccionActiva(-1);
      return;
    }

    if (resultadosDireccion.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceDireccionActiva((actual) =>
        actual < resultadosDireccion.length - 1 ? actual + 1 : 0
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceDireccionActiva((actual) =>
        actual > 0 ? actual - 1 : resultadosDireccion.length - 1
      );
      return;
    }

    if (e.key === "Enter" && indiceDireccionActiva >= 0) {
      e.preventDefault();
      seleccionarDireccion(resultadosDireccion[indiceDireccionActiva]);
    }
  };

  const resaltarCoincidencia = (texto) => {
    const busqueda = formulario.direccion.trim();
    const valor = String(texto || "");

    if (!busqueda) return valor;

    const indice = valor.toLowerCase().indexOf(busqueda.toLowerCase());
    if (indice < 0) return valor;

    return (
      <>
        {valor.slice(0, indice)}
        <mark className="bg-yellow-100 text-inherit rounded px-0.5">
          {valor.slice(indice, indice + busqueda.length)}
        </mark>
        {valor.slice(indice + busqueda.length)}
      </>
    );
  };

  const manejarCambioFamilia = (e) => {
    const { name, value } = e.target;

    if (name === "direccion") {
      setDireccionFamiliaSeleccionada(false);
      setResultadosDireccionFamilia([]);
      setBusquedaDireccionFamiliaRealizada(false);
      setIndiceDireccionFamiliaActiva(-1);
      setFormularioFamilia((actual) => ({
        ...actual,
        direccion: value,
        lat: "",
        lng: "",
      }));
      return;
    }

    setFormularioFamilia((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  useEffect(() => {
    const texto = formularioFamilia.direccion.trim();

    if (direccionFamiliaSeleccionada || texto.length < 3) {
      setResultadosDireccionFamilia([]);
      setBuscandoDireccionFamilia(false);
      setBusquedaDireccionFamiliaRealizada(false);
      setIndiceDireccionFamiliaActiva(-1);
      return undefined;
    }

    let cancelado = false;
    setBuscandoDireccionFamilia(true);
    setBusquedaDireccionFamiliaRealizada(false);
    setIndiceDireccionFamiliaActiva(-1);

    const timer = setTimeout(async () => {
      try {
        const resultados = await buscarDireccionesMultiples(texto);
        if (!cancelado) {
          setResultadosDireccionFamilia(resultados);
          setBusquedaDireccionFamiliaRealizada(true);
        }
      } catch (error) {
        console.error("Error buscando direcciones de familia:", error);
        if (!cancelado) {
          setResultadosDireccionFamilia([]);
          setBusquedaDireccionFamiliaRealizada(true);
        }
      } finally {
        if (!cancelado) {
          setBuscandoDireccionFamilia(false);
        }
      }
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [formularioFamilia.direccion, direccionFamiliaSeleccionada]);

  useEffect(() => {
    const cerrarAlHacerClicFuera = (event) => {
      if (
        contenedorDireccionFamiliaRef.current &&
        !contenedorDireccionFamiliaRef.current.contains(event.target)
      ) {
        setResultadosDireccionFamilia([]);
        setBusquedaDireccionFamiliaRealizada(false);
        setIndiceDireccionFamiliaActiva(-1);
      }
    };

    document.addEventListener("mousedown", cerrarAlHacerClicFuera);
    return () => document.removeEventListener("mousedown", cerrarAlHacerClicFuera);
  }, []);

  const seleccionarDireccionFamilia = (resultado) => {
    setFormularioFamilia((actual) => ({
      ...actual,
      direccion: resultado.etiqueta,
      lat: Number(resultado.lat),
      lng: Number(resultado.lng),
    }));
    setDireccionFamiliaSeleccionada(true);
    setResultadosDireccionFamilia([]);
    setBuscandoDireccionFamilia(false);
    setBusquedaDireccionFamiliaRealizada(false);
    setIndiceDireccionFamiliaActiva(-1);
  };

  const manejarTeclaDireccionFamilia = (e) => {
    if (e.key === "Escape") {
      setResultadosDireccionFamilia([]);
      setBusquedaDireccionFamiliaRealizada(false);
      setIndiceDireccionFamiliaActiva(-1);
      return;
    }

    if (resultadosDireccionFamilia.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceDireccionFamiliaActiva((actual) =>
        actual < resultadosDireccionFamilia.length - 1 ? actual + 1 : 0
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceDireccionFamiliaActiva((actual) =>
        actual > 0 ? actual - 1 : resultadosDireccionFamilia.length - 1
      );
      return;
    }

    if (e.key === "Enter" && indiceDireccionFamiliaActiva >= 0) {
      e.preventDefault();
      seleccionarDireccionFamilia(resultadosDireccionFamilia[indiceDireccionFamiliaActiva]);
    }
  };

  const resaltarCoincidenciaFamilia = (texto) => {
    const busqueda = formularioFamilia.direccion.trim();
    const valor = String(texto || "");

    if (!busqueda) return valor;

    const indice = valor.toLowerCase().indexOf(busqueda.toLowerCase());
    if (indice < 0) return valor;

    return (
      <>
        {valor.slice(0, indice)}
        <mark className="bg-yellow-100 text-inherit rounded px-0.5">
          {valor.slice(indice, indice + busqueda.length)}
        </mark>
        {valor.slice(indice + busqueda.length)}
      </>
    );
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
    setDireccionSeleccionada(false);
    setResultadosDireccion([]);
    setBuscandoDireccion(false);
    setBusquedaDireccionRealizada(false);
    setIndiceDireccionActiva(-1);
  };

  const limpiarFormularioFamilia = (emergencia = null) => {
    const direccionEmergencia = emergencia?.direccion || "";
    const latEmergencia = emergencia?.lat ?? "";
    const lngEmergencia = emergencia?.lng ?? "";

    setFormularioFamilia({
      nombre_cabeza_familia: "",
      direccion: direccionEmergencia,
      lat: latEmergencia,
      lng: lngEmergencia,
      miembros: 1,
      prioridad: "normal",
    });
    setDireccionFamiliaSeleccionada(
      Boolean(direccionEmergencia) && latEmergencia !== "" && lngEmergencia !== ""
    );
    setResultadosDireccionFamilia([]);
    setBuscandoDireccionFamilia(false);
    setBusquedaDireccionFamiliaRealizada(false);
    setIndiceDireccionFamiliaActiva(-1);
  };

  const prepararDatosEmergencia = async () => {
    const direccion = formulario.direccion.trim();
    let lat = formulario.lat;
    let lng = formulario.lng;

    // Si el usuario escribió una dirección pero no escogió una sugerencia,
    // intentamos geocodificarla automáticamente con Nominatim, servicio que
    // ya forma parte de mapaService. Así nunca pedimos coordenadas manuales.
    if (direccion && (lat === "" || lng === "" || lat == null || lng == null)) {
      const ubicacion = await geocodificarDireccion(`${direccion}, Chile`);

      if (!ubicacion) {
        throw new Error(
          "No se pudo ubicar la dirección. Selecciona una sugerencia de la lista."
        );
      }

      lat = ubicacion.lat;
      lng = ubicacion.lng;
    }

    return {
      nombre: formulario.nombre,
      descripcion: formulario.descripcion,
      direccion: direccion || null,
      lat: lat === "" || lat == null ? null : Number(lat),
      lng: lng === "" || lng == null ? null : Number(lng),
    };
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    try {
      const datos = await prepararDatosEmergencia();

      if (editandoId) {
        await actualizarEmergencia(editandoId, datos);
        mostrarMensajeExito("Emergencia actualizada correctamente.");
      } else {
        await crearEmergencia({
          ...datos,
          estado: "activa",
        });
        mostrarMensajeExito("Emergencia creada correctamente.");
      }

      limpiarFormulario();
      setMostrarFormularioEmergencia(false);
      await cargarEmergencias();
    } catch (error) {
      console.error(error.response?.data || error);
      mostrarMensajeError(
        error.response?.data?.mensaje ||
          error.message ||
          "No se pudo guardar la emergencia."
      );
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

    setDireccionSeleccionada(
      emergencia.lat != null && emergencia.lng != null && Boolean(emergencia.direccion)
    );
    setResultadosDireccion([]);
    setBusquedaDireccionRealizada(false);
    setIndiceDireccionActiva(-1);
    setEditandoId(obtenerId(emergencia));
    setMostrarFormularioEmergencia(true);
  };

  const finalizarEmergencia = async (id) => {
    try {
      await cerrarEmergencia(id);
      mostrarMensajeExito("Emergencia cerrada correctamente.");
      await cargarEmergencias();
    } catch (error) {
      console.error(error.response?.data || error);
      mostrarMensajeError(
        error.response?.data?.mensaje || "No se pudo cerrar la emergencia."
      );
    }
  };

  const abrirFormularioAgregarFamilia = async (emergencia) => {
    setEmergenciaSeleccionada(emergencia);
    limpiarFormularioFamilia(emergencia);
    setMostrarModalFamilia(true);
    await cargarFamilias(emergencia);
  };

  const cerrarModalFamilia = () => {
    setMostrarModalFamilia(false);
    limpiarFormularioFamilia();
  };

  const prepararDatosFamilia = async () => {
    const direccion = formularioFamilia.direccion.trim();
    let lat = formularioFamilia.lat;
    let lng = formularioFamilia.lng;

    if (!direccion) {
      throw new Error("Ingresa una dirección para la familia.");
    }

    const direccionEmergencia = String(emergenciaSeleccionada?.direccion || "").trim();
    const mismaDireccionEmergencia =
      direccionEmergencia && direccion.toLowerCase() === direccionEmergencia.toLowerCase();

    if (
      mismaDireccionEmergencia &&
      (lat === "" || lng === "" || lat == null || lng == null) &&
      emergenciaSeleccionada?.lat != null &&
      emergenciaSeleccionada?.lng != null
    ) {
      lat = emergenciaSeleccionada.lat;
      lng = emergenciaSeleccionada.lng;
    }

    if (lat === "" || lng === "" || lat == null || lng == null) {
      const ubicacion = await geocodificarDireccion(`${direccion}, Chile`);

      if (!ubicacion) {
        throw new Error(
          "No se pudo ubicar la dirección de la familia. Selecciona una sugerencia de la lista."
        );
      }

      lat = ubicacion.lat;
      lng = ubicacion.lng;
    }

    return {
      nombre_cabeza_familia: formularioFamilia.nombre_cabeza_familia,
      direccion,
      lat: Number(lat),
      lng: Number(lng),
      miembros: Number(formularioFamilia.miembros) || 1,
      prioridad: formularioFamilia.prioridad,
    };
  };

  const manejarSubmitFamilia = async (e) => {
    e.preventDefault();

    if (!emergenciaSeleccionada) return;

    try {
      const datosFamilia = await prepararDatosFamilia();

      await registrarFamilia(obtenerId(emergenciaSeleccionada), datosFamilia);
      await cargarFamilias(emergenciaSeleccionada);
      cerrarModalFamilia();
      mostrarMensajeExito("Familia registrada correctamente.");
    } catch (error) {
      console.error(error.response?.data || error);
      mostrarMensajeError(
        error.response?.data?.mensaje ||
          error.message ||
          "No se pudo registrar la familia."
      );
    }
  };

  const totalActivas = useMemo(
    () => emergencias.filter((emergencia) => emergencia.estado === "activa").length,
    [emergencias]
  );

  const totalFinalizadas = useMemo(
    () => emergencias.filter((emergencia) => emergencia.estado === "finalizada").length,
    [emergencias]
  );

  const totalSinUbicacion = useMemo(
    () =>
      emergencias.filter(
        (emergencia) =>
          !emergencia.direccion || emergencia.lat == null || emergencia.lng == null
      ).length,
    [emergencias]
  );

  const paginasVisibles = useMemo(() => {
    const maximo = 5;
    let inicio = Math.max(1, paginaActualEmergencias - Math.floor(maximo / 2));
    let fin = Math.min(totalPaginasEmergencias, inicio + maximo - 1);

    if (fin - inicio + 1 < maximo) {
      inicio = Math.max(1, fin - maximo + 1);
    }

    return Array.from({ length: fin - inicio + 1 }, (_, indice) => inicio + indice);
  }, [paginaActualEmergencias, totalPaginasEmergencias]);

  const abrirFormularioNuevaEmergencia = () => {
    limpiarFormulario();
    setMostrarFormularioEmergencia(true);
  };

  const cerrarFormularioEmergencia = () => {
    setMostrarFormularioEmergencia(false);
    limpiarFormulario();
  };

  const inicioMostrado =
    emergenciasFiltradas.length === 0
      ? 0
      : (paginaActualEmergencias - 1) * emergenciasPorPagina + 1;
  const finMostrado = Math.min(
    paginaActualEmergencias * emergenciasPorPagina,
    emergenciasFiltradas.length
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-20 sm:px-6">
        <section className="relative mb-8 overflow-hidden rounded-xl border border-[#bec7d2] bg-[#006192]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(144,205,255,0.38),transparent_35%),linear-gradient(120deg,#006192_0%,#007bb7_58%,#386cea_100%)]" />
          <div className="relative flex min-h-36 items-end p-6 md:min-h-48 md:p-8">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                Coordinación de respuesta
              </p>
              <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                <MdWarningAmber className="shrink-0 text-4xl" aria-hidden="true" />
                Gestión de Emergencias
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
                Registra, actualiza y consulta emergencias junto con sus familias afectadas.
              </p>
            </div>
          </div>
        </section>

        {mensajeExito && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#90cdff] bg-[#cbe6ff] px-4 py-3 text-[#004b72]">
            <MdCheckCircle className="mt-0.5 shrink-0 text-xl" aria-hidden="true" />
            <span className="text-sm font-semibold">{mensajeExito}</span>
          </div>
        )}

        {mensajeError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#ffb4ab] bg-[#ffdad6] px-4 py-3 text-[#93000a]">
            <MdWarningAmber className="mt-0.5 shrink-0 text-xl" aria-hidden="true" />
            <span className="text-sm font-semibold">{mensajeError}</span>
          </div>
        )}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen de emergencias">
          <article className="flex min-h-32 flex-col justify-between rounded-xl border border-[#bec7d2] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs font-medium uppercase tracking-wider text-[#3f4850]">Emergencias totales</span>
              <MdBarChart className="text-2xl text-[#006192]" aria-hidden="true" />
            </div>
            <strong className="text-3xl font-extrabold text-[#191c1d]">{emergencias.length}</strong>
          </article>

          <article className="relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border border-[#bec7d2] bg-white p-6">
            <span className="absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-[#ffdad6] opacity-70" />
            <div className="relative flex items-start justify-between gap-4">
              <span className="text-xs font-medium uppercase tracking-wider text-[#3f4850]">En curso</span>
              <MdHourglassTop className="text-2xl text-[#ba1a1a]" aria-hidden="true" />
            </div>
            <strong className="relative text-3xl font-extrabold text-[#ba1a1a]">{totalActivas}</strong>
          </article>

          <article className="relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border border-[#bec7d2] bg-white p-6">
            <span className="absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-[#e1e3e4] opacity-80" />
            <div className="relative flex items-start justify-between gap-4">
              <span className="text-xs font-medium uppercase tracking-wider text-[#3f4850]">Sin ubicación completa</span>
              <MdLocationOn className="text-2xl text-[#6f7882]" aria-hidden="true" />
            </div>
            <strong className="relative text-3xl font-extrabold text-[#191c1d]">{totalSinUbicacion}</strong>
          </article>

          <article className="relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border border-[#bec7d2] bg-white p-6">
            <span className="absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-[#cbe6ff] opacity-80" />
            <div className="relative flex items-start justify-between gap-4">
              <span className="text-xs font-medium uppercase tracking-wider text-[#3f4850]">Finalizadas</span>
              <MdCheckCircle className="text-2xl text-[#007bb7]" aria-hidden="true" />
            </div>
            <strong className="relative text-3xl font-extrabold text-[#007bb7]">{totalFinalizadas}</strong>
          </article>
        </section>

        <section className="mb-4 rounded-xl border border-[#bec7d2] bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative w-full max-w-xl">
                <span className="sr-only">Buscar emergencia</span>
                <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#6f7882]" aria-hidden="true" />
                <input
                  type="text"
                  value={busquedaEmergencia}
                  onChange={(e) => setBusquedaEmergencia(e.target.value)}
                  placeholder="Buscar emergencia..."
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-sm text-[#191c1d] outline-none transition focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                />
              </label>

              <select
                value={filtroEstadoEmergencia}
                onChange={(e) => setFiltroEstadoEmergencia(e.target.value)}
                className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm text-[#191c1d] outline-none transition focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40 sm:w-auto"
              >
                <option value="todos">Todos los estados</option>
                <option value="activa">En curso</option>
                <option value="finalizada">Finalizadas</option>
              </select>

              {(busquedaEmergencia || filtroEstadoEmergencia !== "todos") && (
                <button
                  type="button"
                  onClick={limpiarFiltrosEmergencias}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#3f4850] transition hover:bg-[#edeeef]"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={abrirFormularioNuevaEmergencia}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#006192] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#007bb7] focus:outline-none focus:ring-2 focus:ring-[#90cdff] sm:w-auto"
            >
              <MdAdd className="text-xl" aria-hidden="true" />
              Nueva Emergencia
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#bec7d2] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#bec7d2] bg-[#e7e8e9]">
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">ID</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">Descripción</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">Ubicación</th>
                  <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#3f4850]">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#bec7d2]">
                {cargando && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-[#3f4850]">
                      <span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-[#bec7d2] border-t-[#006192]" />
                      Cargando emergencias...
                    </td>
                  </tr>
                )}

                {!cargando && emergenciasPaginadas.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-sm text-[#3f4850]">
                      No se encontraron emergencias con los filtros seleccionados.
                    </td>
                  </tr>
                )}

                {!cargando &&
                  Array.isArray(emergenciasPaginadas) &&
                  emergenciasPaginadas.map((emergencia) => (
                    <tr key={obtenerId(emergencia)} className="border-t">
                      <td className="p-3">{emergencia.nombre}</td>
                      <td className="p-3 text-gray-600">
                        {emergencia.direccion || "Sin dirección"}
                      </td>
                      <td className="p-3 capitalize">{emergencia.estado}</td>

                      <td className="p-3 flex flex-wrap gap-2">
                        {emergencia.estado === "activa" ? (
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
                        ) : (
                          <span className="text-gray-500 text-sm">
                            Emergencia finalizada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#bec7d2] bg-[#f8f9fa] p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[#3f4850]">
              Mostrando {inicioMostrado} a {finMostrado} de {emergenciasFiltradas.length} entradas
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPaginaActualEmergencias((pagina) => Math.max(1, pagina - 1))}
                disabled={paginaActualEmergencias === 1}
                className="rounded border border-[#bec7d2] bg-white px-3 py-1.5 text-sm text-[#3f4850] transition hover:bg-[#f3f4f5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              {paginasVisibles.map((pagina) => (
                <button
                  key={pagina}
                  type="button"
                  onClick={() => setPaginaActualEmergencias(pagina)}
                  className={`min-w-9 rounded border px-3 py-1.5 text-sm font-bold transition ${
                    paginaActualEmergencias === pagina
                      ? "border-[#006192] bg-[#006192] text-white"
                      : "border-[#bec7d2] bg-white text-[#3f4850] hover:bg-[#f3f4f5]"
                  }`}
                  aria-current={paginaActualEmergencias === pagina ? "page" : undefined}
                >
                  {pagina}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setPaginaActualEmergencias((pagina) =>
                    Math.min(totalPaginasEmergencias, pagina + 1)
                  )
                }
                disabled={paginaActualEmergencias === totalPaginasEmergencias}
                className="rounded border border-[#bec7d2] bg-white px-3 py-1.5 text-sm text-[#3f4850] transition hover:bg-[#f3f4f5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>

              <button
                type="button"
                onClick={() => setPaginaActualEmergencias(totalPaginasEmergencias)}
                disabled={paginaActualEmergencias === totalPaginasEmergencias}
                className="border rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Última
              </button>
            </div>
          </div>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-3 text-left">Nombre</th>
                    <th className="p-3 text-left">Dirección</th>
                    <th className="p-3 text-left">Miembros</th>
                    <th className="p-3 text-left">Prioridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#bec7d2]">
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
            </div>
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
                <MdClose className="text-2xl" />
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

              <div className="flex flex-col-reverse gap-3 border-t border-[#bec7d2] pt-5 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalFamilia}
                  className="rounded-lg border border-[#bec7d2] bg-white px-5 py-2.5 text-sm font-bold text-[#3f4850] transition hover:bg-[#f3f4f5]"
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
