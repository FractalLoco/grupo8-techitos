import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import {
  MdAdd,
  MdBarChart,
  MdCheckCircle,
  MdChevronRight,
  MdClose,
  MdEdit,
  MdFamilyRestroom,
  MdGroups,
  MdHourglassTop,
  MdLocationOn,
  MdPersonOff,
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

const crearFormularioFamilia = (emergencia = null) => ({
  nombre_cabeza_familia: "",
  direccion: emergencia?.direccion || "",
  lat: emergencia?.lat ?? "",
  lng: emergencia?.lng ?? "",
  miembros: 1,
  prioridad: "normal",
});

function GestionEmergencias() {
  const [emergencias, setEmergencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");
  const [busquedaEmergencia, setBusquedaEmergencia] = useState("");
  const [filtroEstadoEmergencia, setFiltroEstadoEmergencia] = useState("todos");
  const [paginaActualEmergencias, setPaginaActualEmergencias] = useState(1);
  const emergenciasPorPagina = 6;

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

  // Los dos accesos para registrar familias usan modales y estados separados.
  // Así la acción de una tarjeta no reutiliza el modal de la sección inferior.
  const [mostrarModalFamiliaAccion, setMostrarModalFamiliaAccion] = useState(false);
  const [mostrarModalFamiliaSeccion, setMostrarModalFamiliaSeccion] = useState(false);
  const [emergenciaFamiliaAccion, setEmergenciaFamiliaAccion] = useState(null);

  const [formularioFamiliaAccion, setFormularioFamiliaAccion] = useState(
    crearFormularioFamilia()
  );
  const [formularioFamiliaSeccion, setFormularioFamiliaSeccion] = useState(
    crearFormularioFamilia()
  );

  const [resultadosDireccionFamiliaAccion, setResultadosDireccionFamiliaAccion] = useState([]);
  const [buscandoDireccionFamiliaAccion, setBuscandoDireccionFamiliaAccion] = useState(false);
  const [direccionFamiliaAccionSeleccionada, setDireccionFamiliaAccionSeleccionada] = useState(false);
  const [busquedaDireccionFamiliaAccionRealizada, setBusquedaDireccionFamiliaAccionRealizada] = useState(false);
  const [indiceDireccionFamiliaAccionActiva, setIndiceDireccionFamiliaAccionActiva] = useState(-1);
  const contenedorDireccionFamiliaAccionRef = useRef(null);

  const [resultadosDireccionFamiliaSeccion, setResultadosDireccionFamiliaSeccion] = useState([]);
  const [buscandoDireccionFamiliaSeccion, setBuscandoDireccionFamiliaSeccion] = useState(false);
  const [direccionFamiliaSeccionSeleccionada, setDireccionFamiliaSeccionSeleccionada] = useState(false);
  const [busquedaDireccionFamiliaSeccionRealizada, setBusquedaDireccionFamiliaSeccionRealizada] = useState(false);
  const [indiceDireccionFamiliaSeccionActiva, setIndiceDireccionFamiliaSeccionActiva] = useState(-1);
  const contenedorDireccionFamiliaSeccionRef = useRef(null);

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

  const manejarCambioFamiliaAccion = (e) => {
    const { name, value } = e.target;

    if (name === "direccion") {
      setDireccionFamiliaAccionSeleccionada(false);
      setResultadosDireccionFamiliaAccion([]);
      setBusquedaDireccionFamiliaAccionRealizada(false);
      setIndiceDireccionFamiliaAccionActiva(-1);
      setFormularioFamiliaAccion((actual) => ({
        ...actual,
        direccion: value,
        lat: "",
        lng: "",
      }));
      return;
    }

    setFormularioFamiliaAccion((actual) => ({ ...actual, [name]: value }));
  };

  const manejarCambioFamiliaSeccion = (e) => {
    const { name, value } = e.target;

    if (name === "direccion") {
      setDireccionFamiliaSeccionSeleccionada(false);
      setResultadosDireccionFamiliaSeccion([]);
      setBusquedaDireccionFamiliaSeccionRealizada(false);
      setIndiceDireccionFamiliaSeccionActiva(-1);
      setFormularioFamiliaSeccion((actual) => ({
        ...actual,
        direccion: value,
        lat: "",
        lng: "",
      }));
      return;
    }

    setFormularioFamiliaSeccion((actual) => ({ ...actual, [name]: value }));
  };

  useEffect(() => {
    const texto = formularioFamiliaAccion.direccion.trim();

    if (direccionFamiliaAccionSeleccionada || texto.length < 3) {
      setResultadosDireccionFamiliaAccion([]);
      setBuscandoDireccionFamiliaAccion(false);
      setBusquedaDireccionFamiliaAccionRealizada(false);
      setIndiceDireccionFamiliaAccionActiva(-1);
      return undefined;
    }

    let cancelado = false;
    setBuscandoDireccionFamiliaAccion(true);
    setBusquedaDireccionFamiliaAccionRealizada(false);
    setIndiceDireccionFamiliaAccionActiva(-1);

    const timer = setTimeout(async () => {
      try {
        const resultados = await buscarDireccionesMultiples(texto);
        if (!cancelado) {
          setResultadosDireccionFamiliaAccion(resultados);
          setBusquedaDireccionFamiliaAccionRealizada(true);
        }
      } catch (error) {
        console.error("Error buscando dirección de familia desde acciones:", error);
        if (!cancelado) {
          setResultadosDireccionFamiliaAccion([]);
          setBusquedaDireccionFamiliaAccionRealizada(true);
        }
      } finally {
        if (!cancelado) setBuscandoDireccionFamiliaAccion(false);
      }
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [formularioFamiliaAccion.direccion, direccionFamiliaAccionSeleccionada]);

  useEffect(() => {
    const texto = formularioFamiliaSeccion.direccion.trim();

    if (direccionFamiliaSeccionSeleccionada || texto.length < 3) {
      setResultadosDireccionFamiliaSeccion([]);
      setBuscandoDireccionFamiliaSeccion(false);
      setBusquedaDireccionFamiliaSeccionRealizada(false);
      setIndiceDireccionFamiliaSeccionActiva(-1);
      return undefined;
    }

    let cancelado = false;
    setBuscandoDireccionFamiliaSeccion(true);
    setBusquedaDireccionFamiliaSeccionRealizada(false);
    setIndiceDireccionFamiliaSeccionActiva(-1);

    const timer = setTimeout(async () => {
      try {
        const resultados = await buscarDireccionesMultiples(texto);
        if (!cancelado) {
          setResultadosDireccionFamiliaSeccion(resultados);
          setBusquedaDireccionFamiliaSeccionRealizada(true);
        }
      } catch (error) {
        console.error("Error buscando dirección de familia desde sección:", error);
        if (!cancelado) {
          setResultadosDireccionFamiliaSeccion([]);
          setBusquedaDireccionFamiliaSeccionRealizada(true);
        }
      } finally {
        if (!cancelado) setBuscandoDireccionFamiliaSeccion(false);
      }
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [formularioFamiliaSeccion.direccion, direccionFamiliaSeccionSeleccionada]);

  useEffect(() => {
    const cerrarSugerenciasFamilia = (event) => {
      if (
        contenedorDireccionFamiliaAccionRef.current &&
        !contenedorDireccionFamiliaAccionRef.current.contains(event.target)
      ) {
        setResultadosDireccionFamiliaAccion([]);
        setBusquedaDireccionFamiliaAccionRealizada(false);
        setIndiceDireccionFamiliaAccionActiva(-1);
      }

      if (
        contenedorDireccionFamiliaSeccionRef.current &&
        !contenedorDireccionFamiliaSeccionRef.current.contains(event.target)
      ) {
        setResultadosDireccionFamiliaSeccion([]);
        setBusquedaDireccionFamiliaSeccionRealizada(false);
        setIndiceDireccionFamiliaSeccionActiva(-1);
      }
    };

    document.addEventListener("mousedown", cerrarSugerenciasFamilia);
    return () => document.removeEventListener("mousedown", cerrarSugerenciasFamilia);
  }, []);

  const seleccionarDireccionFamiliaAccion = (resultado) => {
    setFormularioFamiliaAccion((actual) => ({
      ...actual,
      direccion: resultado.etiqueta,
      lat: Number(resultado.lat),
      lng: Number(resultado.lng),
    }));
    setDireccionFamiliaAccionSeleccionada(true);
    setResultadosDireccionFamiliaAccion([]);
    setBusquedaDireccionFamiliaAccionRealizada(false);
    setIndiceDireccionFamiliaAccionActiva(-1);
  };

  const seleccionarDireccionFamiliaSeccion = (resultado) => {
    setFormularioFamiliaSeccion((actual) => ({
      ...actual,
      direccion: resultado.etiqueta,
      lat: Number(resultado.lat),
      lng: Number(resultado.lng),
    }));
    setDireccionFamiliaSeccionSeleccionada(true);
    setResultadosDireccionFamiliaSeccion([]);
    setBusquedaDireccionFamiliaSeccionRealizada(false);
    setIndiceDireccionFamiliaSeccionActiva(-1);
  };

  const manejarTeclaDireccionFamiliaAccion = (e) => {
    if (e.key === "Escape") {
      setResultadosDireccionFamiliaAccion([]);
      setBusquedaDireccionFamiliaAccionRealizada(false);
      setIndiceDireccionFamiliaAccionActiva(-1);
      return;
    }

    if (resultadosDireccionFamiliaAccion.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceDireccionFamiliaAccionActiva((actual) =>
        actual < resultadosDireccionFamiliaAccion.length - 1 ? actual + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceDireccionFamiliaAccionActiva((actual) =>
        actual > 0 ? actual - 1 : resultadosDireccionFamiliaAccion.length - 1
      );
    } else if (e.key === "Enter" && indiceDireccionFamiliaAccionActiva >= 0) {
      e.preventDefault();
      seleccionarDireccionFamiliaAccion(
        resultadosDireccionFamiliaAccion[indiceDireccionFamiliaAccionActiva]
      );
    }
  };

  const manejarTeclaDireccionFamiliaSeccion = (e) => {
    if (e.key === "Escape") {
      setResultadosDireccionFamiliaSeccion([]);
      setBusquedaDireccionFamiliaSeccionRealizada(false);
      setIndiceDireccionFamiliaSeccionActiva(-1);
      return;
    }

    if (resultadosDireccionFamiliaSeccion.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceDireccionFamiliaSeccionActiva((actual) =>
        actual < resultadosDireccionFamiliaSeccion.length - 1 ? actual + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceDireccionFamiliaSeccionActiva((actual) =>
        actual > 0 ? actual - 1 : resultadosDireccionFamiliaSeccion.length - 1
      );
    } else if (e.key === "Enter" && indiceDireccionFamiliaSeccionActiva >= 0) {
      e.preventDefault();
      seleccionarDireccionFamiliaSeccion(
        resultadosDireccionFamiliaSeccion[indiceDireccionFamiliaSeccionActiva]
      );
    }
  };

  const resaltarCoincidenciaFamilia = (texto, busqueda) => {
    const valor = String(texto || "");
    const termino = String(busqueda || "").trim();
    if (!termino) return valor;

    const indice = valor.toLowerCase().indexOf(termino.toLowerCase());
    if (indice < 0) return valor;

    return (
      <>
        {valor.slice(0, indice)}
        <mark className="rounded bg-yellow-100 px-0.5 text-inherit">
          {valor.slice(indice, indice + termino.length)}
        </mark>
        {valor.slice(indice + termino.length)}
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

  const reiniciarFormularioFamiliaAccion = (emergencia = null) => {
    setFormularioFamiliaAccion(crearFormularioFamilia(emergencia));
    setDireccionFamiliaAccionSeleccionada(
      Boolean(emergencia?.direccion) && emergencia?.lat != null && emergencia?.lng != null
    );
    setResultadosDireccionFamiliaAccion([]);
    setBuscandoDireccionFamiliaAccion(false);
    setBusquedaDireccionFamiliaAccionRealizada(false);
    setIndiceDireccionFamiliaAccionActiva(-1);
  };

  const reiniciarFormularioFamiliaSeccion = (emergencia = null) => {
    setFormularioFamiliaSeccion(crearFormularioFamilia(emergencia));
    setDireccionFamiliaSeccionSeleccionada(
      Boolean(emergencia?.direccion) && emergencia?.lat != null && emergencia?.lng != null
    );
    setResultadosDireccionFamiliaSeccion([]);
    setBuscandoDireccionFamiliaSeccion(false);
    setBusquedaDireccionFamiliaSeccionRealizada(false);
    setIndiceDireccionFamiliaSeccionActiva(-1);
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

  const prepararDatosFamilia = async (formularioFamilia) => {
    const direccion = formularioFamilia.direccion.trim();
    let lat = formularioFamilia.lat;
    let lng = formularioFamilia.lng;

    if (direccion && (lat === "" || lng === "" || lat == null || lng == null)) {
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
      nombre_cabeza_familia: formularioFamilia.nombre_cabeza_familia.trim(),
      direccion: direccion || null,
      lat: lat === "" || lat == null ? null : Number(lat),
      lng: lng === "" || lng == null ? null : Number(lng),
      miembros: Number(formularioFamilia.miembros) || 1,
      prioridad: formularioFamilia.prioridad,
    };
  };

  const abrirModalFamiliaDesdeAccion = async (emergencia) => {
    setEmergenciaFamiliaAccion(emergencia);
    reiniciarFormularioFamiliaAccion(emergencia);
    setMostrarModalFamiliaAccion(true);
    await cargarFamilias(emergencia);
  };

  const cerrarModalFamiliaAccion = () => {
    setMostrarModalFamiliaAccion(false);
    reiniciarFormularioFamiliaAccion();
    setEmergenciaFamiliaAccion(null);
  };

  const abrirModalFamiliaDesdeSeccion = () => {
    if (!emergenciaSeleccionada) return;
    reiniciarFormularioFamiliaSeccion(emergenciaSeleccionada);
    setMostrarModalFamiliaSeccion(true);
  };

  const cerrarModalFamiliaSeccion = () => {
    setMostrarModalFamiliaSeccion(false);
    reiniciarFormularioFamiliaSeccion();
  };

  const manejarSubmitFamiliaAccion = async (e) => {
    e.preventDefault();
    if (!emergenciaFamiliaAccion) return;

    try {
      const datosFamilia = await prepararDatosFamilia(formularioFamiliaAccion);
      await registrarFamilia(obtenerId(emergenciaFamiliaAccion), datosFamilia);
      await cargarFamilias(emergenciaFamiliaAccion);
      cerrarModalFamiliaAccion();
      mostrarMensajeExito("Familia registrada correctamente.");
    } catch (error) {
      console.error(error.response?.data || error);
      mostrarMensajeError(
        error.response?.data?.mensaje || error.message || "No se pudo registrar la familia."
      );
    }
  };

  const manejarSubmitFamiliaSeccion = async (e) => {
    e.preventDefault();
    if (!emergenciaSeleccionada) return;

    try {
      const datosFamilia = await prepararDatosFamilia(formularioFamiliaSeccion);
      await registrarFamilia(obtenerId(emergenciaSeleccionada), datosFamilia);
      await cargarFamilias(emergenciaSeleccionada);
      cerrarModalFamiliaSeccion();
      mostrarMensajeExito("Familia registrada correctamente.");
    } catch (error) {
      console.error(error.response?.data || error);
      mostrarMensajeError(
        error.response?.data?.mensaje || error.message || "No se pudo registrar la familia."
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

  const obtenerNombreCuadrilla = (emergencia) =>
    emergencia?.cuadrilla?.nombre ||
    emergencia?.cuadrilla_asignada?.nombre ||
    emergencia?.cuadrilla_nombre ||
    emergencia?.nombre_cuadrilla ||
    "";

  const obtenerInicialesCuadrilla = (nombre) =>
    String(nombre || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "C";

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

        <section aria-label="Listado de emergencias">
          {cargando ? (
            <div className="rounded-xl border border-[#bec7d2] bg-white px-6 py-14 text-center text-sm text-[#3f4850]">
              <span className="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-[#bec7d2] border-t-[#006192]" />
              Cargando emergencias...
            </div>
          ) : emergenciasPaginadas.length === 0 ? (
            <div className="rounded-xl border border-[#bec7d2] bg-white px-6 py-14 text-center text-sm text-[#3f4850]">
              No se encontraron emergencias con los filtros seleccionados.
            </div>
          ) : (
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emergenciasPaginadas.map((emergencia) => {
                const id = obtenerId(emergencia);
                const activa = emergencia.estado === "activa";
                const nombreCuadrilla = obtenerNombreCuadrilla(emergencia);
                const seleccionada =
                  emergenciaSeleccionada && obtenerId(emergenciaSeleccionada) === id;

                return (
                  <article
                    key={id}
                    className={`group flex min-h-[270px] flex-col gap-4 rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${
                      seleccionada
                        ? "border-[#006192] ring-2 ring-[#90cdff]/45"
                        : "border-[#bec7d2]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-[#3f4850]">
                        #EM-{String(id).padStart(4, "0")}
                      </span>

                      {activa ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdad6]/70 px-2.5 py-1 text-xs font-medium text-[#ba1a1a]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" />
                          En curso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#90cdff]/30 px-2.5 py-1 text-xs font-medium text-[#007bb7]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#007bb7]" />
                          Finalizada
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-1 text-lg font-bold leading-6 text-[#191c1d]">
                        {emergencia.nombre}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-5 text-[#3f4850]">
                        {emergencia.descripcion || "Sin descripción"}
                      </p>
                    </div>

                    <div className="flex items-start gap-2 text-[#3f4850]">
                      <MdLocationOn className="mt-0.5 shrink-0 text-base" aria-hidden="true" />
                      <span className="line-clamp-2 text-sm">
                        {emergencia.direccion || "Sin dirección"}
                      </span>
                    </div>

                    <hr className="my-1 border-[#bec7d2]" />

                    <div className="mt-auto flex items-end justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {nombreCuadrilla ? (
                          <>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007bb7] text-[10px] font-bold text-white">
                              {obtenerInicialesCuadrilla(nombreCuadrilla)}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-medium text-[#3f4850]">Cuadrilla</span>
                              <span className="block truncate text-sm font-semibold text-[#191c1d]">
                                {nombreCuadrilla}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e7e8e9] text-[#3f4850]">
                              <MdPersonOff className="text-base" aria-hidden="true" />
                            </div>
                            <div>
                              <span className="block text-xs font-medium text-[#3f4850]">Cuadrilla</span>
                              <span className="block text-sm italic text-[#6f7882]">Sin asignar</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {activa && (
                          <button
                            type="button"
                            onClick={() => editarEmergencia(emergencia)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#3f4850] transition hover:bg-[#cbe6ff]/60 hover:text-[#006192]"
                            title="Editar emergencia"
                            aria-label={`Editar ${emergencia.nombre}`}
                          >
                            <MdEdit className="text-lg" aria-hidden="true" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => cargarFamilias(emergencia)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#003ea7] transition hover:bg-[#dbe1ff]"
                          title="Ver familias"
                          aria-label={`Ver familias de ${emergencia.nombre}`}
                        >
                          <MdGroups className="text-lg" aria-hidden="true" />
                        </button>

                        {activa && (
                          <button
                            type="button"
                            onClick={() => abrirModalFamiliaDesdeAccion(emergencia)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#006192] transition hover:bg-[#cbe6ff]/60"
                            title="Agregar familia"
                            aria-label={`Agregar familia a ${emergencia.nombre}`}
                          >
                            <MdFamilyRestroom className="text-lg" aria-hidden="true" />
                          </button>
                        )}

                        {activa ? (
                          <button
                            type="button"
                            onClick={() => finalizarEmergencia(id)}
                            className="rounded-lg bg-[#2e3132] px-2.5 py-2 text-xs font-bold text-white transition hover:bg-[#191c1d]"
                            title="Cerrar emergencia"
                          >
                            Cerrar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => cargarFamilias(emergencia)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#006192] transition hover:bg-[#006192]/10"
                            title="Consultar emergencia"
                            aria-label={`Consultar ${emergencia.nombre}`}
                          >
                            <MdChevronRight className="text-xl" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-4 rounded-xl border border-[#bec7d2] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
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
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-[#bec7d2] bg-white">
          <div className="flex flex-col gap-2 border-b border-[#bec7d2] bg-[#f3f4f5] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#191c1d]">Familias afectadas</h2>
              <p className="mt-1 text-sm text-[#3f4850]">
                {emergenciaSeleccionada
                  ? `Emergencia seleccionada: ${emergenciaSeleccionada.nombre}`
                  : "Selecciona una emergencia activa para consultar sus familias"}
              </p>
            </div>
            {emergenciaSeleccionada && emergenciaSeleccionada.estado === "activa" && (
              <button
                type="button"
                onClick={abrirModalFamiliaDesdeSeccion}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#006192] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#007bb7]"
              >
                <MdAdd aria-hidden="true" />
                Agregar familia
              </button>
            )}
          </div>

          {familias.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[#6f7882]">
              No hay familias registradas para la emergencia seleccionada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-[#e7e8e9]">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">Nombre</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">Dirección</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">Miembros</th>
                    <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#3f4850]">Prioridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#bec7d2]">
                  {familias.map((familia) => (
                    <tr key={familia.id} className="hover:bg-[#f8f9fa]">
                      <td className="px-6 py-4 text-sm font-semibold text-[#191c1d]">{familia.nombre_cabeza_familia}</td>
                      <td className="px-6 py-4 text-sm text-[#3f4850]">{familia.direccion || "Sin dirección"}</td>
                      <td className="px-6 py-4 text-sm text-[#3f4850]">{familia.miembros ?? familia.cantidad_integrantes ?? 1}</td>
                      <td className="px-6 py-4 text-sm capitalize text-[#3f4850]">{familia.prioridad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {mostrarFormularioEmergencia && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#bec7d2] bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#bec7d2] bg-white px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#006192]">Gestión de emergencia</p>
                <h2 className="mt-1 text-xl font-bold text-[#191c1d]">
                  {editandoId ? "Editar emergencia" : "Nueva emergencia"}
                </h2>
              </div>
              <button
                type="button"
                onClick={cerrarFormularioEmergencia}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#3f4850] transition hover:bg-[#edeeef]"
                aria-label="Cerrar formulario"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            <form onSubmit={manejarSubmit} className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Nombre de la emergencia</span>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Ej.: Inundación Sector Sur"
                  value={formulario.nombre}
                  onChange={manejarCambio}
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none transition focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                  required
                />
              </label>

              <div ref={contenedorDireccionRef} className="relative">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#191c1d]">Ubicación geográfica</span>
                  <div className="relative">
                    <MdLocationOn className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#6f7882]" />
                    <input
                      type="text"
                      name="direccion"
                      placeholder="Escribe calle, número y comuna"
                      value={formulario.direccion}
                      onChange={manejarCambio}
                      onKeyDown={manejarTeclaDireccion}
                      onFocus={() => {
                        if (formulario.direccion.trim().length >= 3) {
                          setDireccionSeleccionada(false);
                        }
                      }}
                      autoComplete="off"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={
                        !direccionSeleccionada &&
                        formulario.direccion.trim().length >= 3 &&
                        (buscandoDireccion || resultadosDireccion.length > 0 || busquedaDireccionRealizada)
                      }
                      aria-controls="lista-sugerencias-direccion"
                      className={`w-full rounded-lg border bg-[#f8f9fa] py-2.5 pl-10 pr-10 text-sm outline-none transition ${
                        direccionSeleccionada
                          ? "border-[#007bb7] ring-2 ring-[#cbe6ff]"
                          : "border-[#bec7d2] focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                      }`}
                    />

                    {buscandoDireccion ? (
                      <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#bec7d2] border-t-[#006192]" />
                    ) : formulario.direccion ? (
                      <button
                        type="button"
                        onClick={() => manejarCambio({ target: { name: "direccion", value: "" } })}
                        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#6f7882] hover:bg-[#edeeef]"
                        aria-label="Limpiar dirección"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </label>

                {!direccionSeleccionada &&
                  formulario.direccion.trim().length >= 3 &&
                  (buscandoDireccion || resultadosDireccion.length > 0 || busquedaDireccionRealizada) && (
                    <div
                      id="lista-sugerencias-direccion"
                      role="listbox"
                      className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-[#bec7d2] bg-white shadow-2xl"
                    >
                      {buscandoDireccion && resultadosDireccion.length === 0 ? (
                        <div className="flex items-center gap-3 px-5 py-4 text-sm text-[#3f4850]">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#bec7d2] border-t-[#006192]" />
                          Buscando direcciones en Chile...
                        </div>
                      ) : resultadosDireccion.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto py-1">
                          {resultadosDireccion.map((resultado, indice) => (
                            <button
                              key={`${resultado.lat}-${resultado.lng}-${indice}`}
                              type="button"
                              role="option"
                              aria-selected={indiceDireccionActiva === indice}
                              onMouseEnter={() => setIndiceDireccionActiva(indice)}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => seleccionarDireccion(resultado)}
                              className={`w-full px-5 py-3.5 text-left transition ${
                                indiceDireccionActiva === indice ? "bg-[#cbe6ff]/55" : "hover:bg-[#f3f4f5]"
                              }`}
                            >
                              <span className="block text-sm leading-6">
                                <span className="font-semibold text-[#191c1d]">
                                  {resaltarCoincidencia(resultado.principal || resultado.etiqueta)}
                                </span>
                                {resultado.secundaria && (
                                  <span className="ml-1.5 font-normal text-[#3f4850]">{resultado.secundaria}</span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#191c1d]">No encontramos coincidencias claras</p>
                          <p className="mt-1 text-xs text-[#3f4850]">
                            Prueba agregando número, comuna o región. Ejemplo: &quot;O&apos;Higgins 123, Yumbel&quot;.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {direccionSeleccionada && formulario.direccion && (
                  <div className="mt-2 rounded-lg border border-[#90cdff] bg-[#cbe6ff]/60 px-3 py-2 text-xs text-[#004b72]">
                    <strong>Dirección seleccionada.</strong> Las coordenadas se guardarán automáticamente.
                  </div>
                )}
              </div>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Descripción del evento</span>
                <textarea
                  name="descripcion"
                  placeholder="Describe el evento y la situación actual..."
                  value={formulario.descripcion}
                  onChange={manejarCambio}
                  className="min-h-32 w-full resize-y rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-3 text-sm outline-none transition focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                  required
                />
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-[#bec7d2] pt-5 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarFormularioEmergencia}
                  className="rounded-lg border border-[#bec7d2] bg-white px-5 py-2.5 text-sm font-bold text-[#3f4850] transition hover:bg-[#f3f4f5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#006192] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#007bb7] focus:outline-none focus:ring-2 focus:ring-[#90cdff]"
                >
                  {editandoId ? "Actualizar emergencia" : "Crear emergencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalFamiliaAccion && emergenciaFamiliaAccion && (
        <div className="fixed inset-0 z-[4100] flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#bec7d2] bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#bec7d2] bg-white px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#006192]">Acción de emergencia</p>
                <h2 className="mt-1 text-xl font-bold text-[#191c1d]">
                  Agregar familia a {emergenciaFamiliaAccion.nombre}
                </h2>
              </div>
              <button
                type="button"
                onClick={cerrarModalFamiliaAccion}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#3f4850] transition hover:bg-[#edeeef]"
                aria-label="Cerrar formulario de familia desde acciones"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            <form onSubmit={manejarSubmitFamiliaAccion} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Nombre jefe/a de familia</span>
                <input
                  type="text"
                  name="nombre_cabeza_familia"
                  value={formularioFamiliaAccion.nombre_cabeza_familia}
                  onChange={manejarCambioFamiliaAccion}
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                  required
                />
              </label>

              <div ref={contenedorDireccionFamiliaAccionRef} className="relative md:col-span-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#191c1d]">Ubicación geográfica</span>
                  <div className="relative">
                    <MdLocationOn className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#6f7882]" />
                    <input
                      type="text"
                      name="direccion"
                      placeholder="Escribe calle, número y comuna"
                      value={formularioFamiliaAccion.direccion}
                      onChange={manejarCambioFamiliaAccion}
                      onKeyDown={manejarTeclaDireccionFamiliaAccion}
                      onFocus={() => {
                        if (formularioFamiliaAccion.direccion.trim().length >= 3) {
                          setDireccionFamiliaAccionSeleccionada(false);
                        }
                      }}
                      autoComplete="off"
                      className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                      required
                    />
                  </div>
                </label>

                {(buscandoDireccionFamiliaAccion ||
                  resultadosDireccionFamiliaAccion.length > 0 ||
                  busquedaDireccionFamiliaAccionRealizada) &&
                  !direccionFamiliaAccionSeleccionada && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#bec7d2] bg-white shadow-2xl">
                      {buscandoDireccionFamiliaAccion ? (
                        <div className="flex items-center gap-3 px-5 py-4 text-sm text-[#3f4850]">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#bec7d2] border-t-[#006192]" />
                          Buscando direcciones en Chile...
                        </div>
                      ) : resultadosDireccionFamiliaAccion.length > 0 ? (
                        <div className="max-h-72 overflow-y-auto py-1">
                          {resultadosDireccionFamiliaAccion.map((resultado, indice) => (
                            <button
                              key={`${resultado.lat}-${resultado.lng}-${indice}`}
                              type="button"
                              onMouseEnter={() => setIndiceDireccionFamiliaAccionActiva(indice)}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => seleccionarDireccionFamiliaAccion(resultado)}
                              className={`w-full px-5 py-3.5 text-left transition ${
                                indiceDireccionFamiliaAccionActiva === indice
                                  ? "bg-[#cbe6ff]/55"
                                  : "hover:bg-[#f3f4f5]"
                              }`}
                            >
                              <span className="block text-sm leading-6">
                                <span className="font-semibold text-[#191c1d]">
                                  {resaltarCoincidenciaFamilia(
                                    resultado.principal || resultado.etiqueta,
                                    formularioFamiliaAccion.direccion
                                  )}
                                </span>
                                {resultado.secundaria && (
                                  <span className="ml-1.5 text-[#3f4850]">{resultado.secundaria}</span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#191c1d]">No encontramos coincidencias claras</p>
                          <p className="mt-1 text-xs text-[#3f4850]">Agrega número, comuna o región para precisar la búsqueda.</p>
                        </div>
                      )}
                    </div>
                  )}

                {direccionFamiliaAccionSeleccionada && formularioFamiliaAccion.direccion && (
                  <div className="mt-2 rounded-lg border border-[#90cdff] bg-[#cbe6ff]/60 px-3 py-2 text-xs text-[#004b72]">
                    <strong>Dirección seleccionada.</strong> Latitud y longitud se determinaron automáticamente.
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Cantidad de miembros</span>
                <input
                  type="number"
                  min="1"
                  name="miembros"
                  value={formularioFamiliaAccion.miembros}
                  onChange={manejarCambioFamiliaAccion}
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Prioridad</span>
                <select
                  name="prioridad"
                  value={formularioFamiliaAccion.prioridad}
                  onChange={manejarCambioFamiliaAccion}
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                >
                  <option value="alta">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="baja">Baja</option>
                </select>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-[#bec7d2] pt-5 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalFamiliaAccion}
                  className="rounded-lg border border-[#bec7d2] bg-white px-5 py-2.5 text-sm font-bold text-[#3f4850] transition hover:bg-[#f3f4f5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#006192] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#007bb7]"
                >
                  Guardar familia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mostrarModalFamiliaSeccion && emergenciaSeleccionada && (
        <div className="fixed inset-0 z-[4200] flex items-center justify-center bg-black/55 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#bec7d2] bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#bec7d2] bg-white px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#006192]">Familias afectadas</p>
                <h2 className="mt-1 text-xl font-bold text-[#191c1d]">
                  Registrar familia en {emergenciaSeleccionada.nombre}
                </h2>
              </div>
              <button
                type="button"
                onClick={cerrarModalFamiliaSeccion}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#3f4850] transition hover:bg-[#edeeef]"
                aria-label="Cerrar formulario de familia de la sección"
              >
                <MdClose className="text-2xl" />
              </button>
            </div>

            <form onSubmit={manejarSubmitFamiliaSeccion} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Nombre jefe/a de familia</span>
                <input
                  type="text"
                  name="nombre_cabeza_familia"
                  value={formularioFamiliaSeccion.nombre_cabeza_familia}
                  onChange={manejarCambioFamiliaSeccion}
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                  required
                />
              </label>

              <div ref={contenedorDireccionFamiliaSeccionRef} className="relative md:col-span-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#191c1d]">Ubicación geográfica</span>
                  <div className="relative">
                    <MdLocationOn className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[#6f7882]" />
                    <input
                      type="text"
                      name="direccion"
                      placeholder="Escribe calle, número y comuna"
                      value={formularioFamiliaSeccion.direccion}
                      onChange={manejarCambioFamiliaSeccion}
                      onKeyDown={manejarTeclaDireccionFamiliaSeccion}
                      onFocus={() => {
                        if (formularioFamiliaSeccion.direccion.trim().length >= 3) {
                          setDireccionFamiliaSeccionSeleccionada(false);
                        }
                      }}
                      autoComplete="off"
                      className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                      required
                    />
                  </div>
                </label>

                {(buscandoDireccionFamiliaSeccion ||
                  resultadosDireccionFamiliaSeccion.length > 0 ||
                  busquedaDireccionFamiliaSeccionRealizada) &&
                  !direccionFamiliaSeccionSeleccionada && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#bec7d2] bg-white shadow-2xl">
                      {buscandoDireccionFamiliaSeccion ? (
                        <div className="flex items-center gap-3 px-5 py-4 text-sm text-[#3f4850]">
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#bec7d2] border-t-[#006192]" />
                          Buscando direcciones en Chile...
                        </div>
                      ) : resultadosDireccionFamiliaSeccion.length > 0 ? (
                        <div className="max-h-72 overflow-y-auto py-1">
                          {resultadosDireccionFamiliaSeccion.map((resultado, indice) => (
                            <button
                              key={`${resultado.lat}-${resultado.lng}-${indice}`}
                              type="button"
                              onMouseEnter={() => setIndiceDireccionFamiliaSeccionActiva(indice)}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => seleccionarDireccionFamiliaSeccion(resultado)}
                              className={`w-full px-5 py-3.5 text-left transition ${
                                indiceDireccionFamiliaSeccionActiva === indice
                                  ? "bg-[#cbe6ff]/55"
                                  : "hover:bg-[#f3f4f5]"
                              }`}
                            >
                              <span className="block text-sm leading-6">
                                <span className="font-semibold text-[#191c1d]">
                                  {resaltarCoincidenciaFamilia(
                                    resultado.principal || resultado.etiqueta,
                                    formularioFamiliaSeccion.direccion
                                  )}
                                </span>
                                {resultado.secundaria && (
                                  <span className="ml-1.5 text-[#3f4850]">{resultado.secundaria}</span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-5 py-4">
                          <p className="text-sm font-semibold text-[#191c1d]">No encontramos coincidencias claras</p>
                          <p className="mt-1 text-xs text-[#3f4850]">Agrega número, comuna o región para precisar la búsqueda.</p>
                        </div>
                      )}
                    </div>
                  )}

                {direccionFamiliaSeccionSeleccionada && formularioFamiliaSeccion.direccion && (
                  <div className="mt-2 rounded-lg border border-[#90cdff] bg-[#cbe6ff]/60 px-3 py-2 text-xs text-[#004b72]">
                    <strong>Dirección seleccionada.</strong> Latitud y longitud se determinaron automáticamente.
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Cantidad de miembros</span>
                <input
                  type="number"
                  min="1"
                  name="miembros"
                  value={formularioFamiliaSeccion.miembros}
                  onChange={manejarCambioFamiliaSeccion}
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[#191c1d]">Prioridad</span>
                <select
                  name="prioridad"
                  value={formularioFamiliaSeccion.prioridad}
                  onChange={manejarCambioFamiliaSeccion}
                  className="w-full rounded-lg border border-[#bec7d2] bg-[#f8f9fa] px-4 py-2.5 text-sm outline-none focus:border-[#006192] focus:ring-2 focus:ring-[#90cdff]/40"
                >
                  <option value="alta">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="baja">Baja</option>
                </select>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-[#bec7d2] pt-5 md:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalFamiliaSeccion}
                  className="rounded-lg border border-[#bec7d2] bg-white px-5 py-2.5 text-sm font-bold text-[#3f4850] transition hover:bg-[#f3f4f5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#006192] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#007bb7]"
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
