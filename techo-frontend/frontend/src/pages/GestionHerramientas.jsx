// Pagina de control de herramientas: el jefe las registra al inicio de la jornada,
// actualiza su estado durante el dia y al cierre genera el balance automatico.
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import {
  obtenerHerramientas,
  registrarHerramienta,
  registrarHerramientasMasivas,
  actualizarEstadoHerramienta,
  obtenerBalance,
  cerrarBalanceDia,
} from '../services/herramientaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import { obtenerCuadrillasPorEmergencia } from '../services/cuadrillaService';

// Colores para cada estado de herramienta en la lista
const COLOR_ESTADO_HERRAMIENTA = {
  entregada: { bg: '#eaf4fb', texto: '#1a5276', etiqueta: 'Entregada' },
  buena: { bg: '#eafaf1', texto: '#1e8449', etiqueta: 'Buena' },
  danada: { bg: '#fef9e7', texto: '#d35400', etiqueta: 'Danada' },
  perdida: { bg: '#fdecea', texto: '#c0392b', etiqueta: 'Perdida' },
  no_devuelta: { bg: '#f4ecf7', texto: '#6c3483', etiqueta: 'No devuelta' },
};

export default function GestionHerramientas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';
  const puedeEditar = esCoordinador || esJefe;

  // Seleccion de emergencia y cuadrilla
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [cuadrillaId, setCuadrillaId] = useState('');

  // Datos de herramientas
  const [herramientas, setHerramientas] = useState([]);
  const [balance, setBalance] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Filtro de estado para la lista de herramientas
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Estado del panel de registro de herramientas
  const [modoRegistro, setModoRegistro] = useState('individual'); // 'individual' | 'masivo'
  const [nombreHerramienta, setNombreHerramienta] = useState('');
  const [nombresMultiples, setNombresMultiples] = useState('');

  // Herramienta cuyo estado se esta actualizando
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Carga emergencias activas al montar
  useEffect(() => {
    obtenerEmergencias()
      .then((res) => {
        const lista = res.datos?.emergencias || res.datos || [];
        const activas = Array.isArray(lista) ? lista.filter((e) => e.estado === 'activa') : [];
        setEmergencias(activas);
        if (activas.length > 0) setEmergenciaId(String(activas[0].id));
      })
      .catch(() => setError('No se pudieron cargar las emergencias'));
  }, []);

  // Cuando cambia la emergencia carga sus cuadrillas
  useEffect(() => {
    if (!emergenciaId) return;
    obtenerCuadrillasPorEmergencia(emergenciaId)
      .then((res) => {
        const lista = res.datos?.cuadrillas || [];
        setCuadrillas(lista);
        // Si es jefe, preselecciono su cuadrilla automaticamente
        if (esJefe) {
          const miCuadrilla = lista.find((c) => c.jefe_id === usuario?.id);
          setCuadrillaId(miCuadrilla ? String(miCuadrilla.id) : '');
        } else if (lista.length > 0) {
          setCuadrillaId(String(lista[0].id));
        }
      })
      .catch(() => setError('Error al cargar cuadrillas'));
  }, [emergenciaId, esJefe, usuario]);

  // Cuando cambia la cuadrilla carga sus herramientas y balance
  useEffect(() => {
    if (!cuadrillaId) return;
    cargarHerramientas();
    cargarBalance();
  }, [cuadrillaId]);

  const cargarHerramientas = async () => {
    setCargando(true);
    try {
      const res = await obtenerHerramientas(cuadrillaId);
      setHerramientas(res.datos?.herramientas || []);
    } catch {
      setError('Error al cargar herramientas');
    } finally {
      setCargando(false);
    }
  };

  const cargarBalance = async () => {
    try {
      const res = await obtenerBalance(cuadrillaId);
      setBalance(res.datos?.balance || null);
    } catch {
      // El balance puede no existir si no hay herramientas aun
    }
  };

  const mostrarExito = (msg) => {
    setExito(msg);
    setTimeout(() => setExito(''), 3500);
  };

  // Registra una herramienta individual
  const handleRegistrarIndividual = async () => {
    if (!nombreHerramienta.trim()) return;
    setGuardando(true);
    const res = await registrarHerramienta(cuadrillaId, nombreHerramienta.trim());
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setNombreHerramienta('');
      await cargarHerramientas();
      await cargarBalance();
      mostrarExito('Herramienta registrada');
    } else {
      setError(res.mensaje || 'Error al registrar');
    }
  };

  // Registra varias herramientas a la vez separadas por coma o salto de linea
  const handleRegistrarMasivo = async () => {
    const nombres = nombresMultiples
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (nombres.length === 0) return;
    setGuardando(true);
    const res = await registrarHerramientasMasivas(cuadrillaId, nombres);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setNombresMultiples('');
      await cargarHerramientas();
      await cargarBalance();
      mostrarExito(`${nombres.length} herramientas registradas`);
    } else {
      setError(res.mensaje || 'Error al registrar');
    }
  };

  // Guarda el cambio de estado de una herramienta (danada, perdida, buena, etc.)
  const handleGuardarEstado = async (herramientaId) => {
    if (!nuevoEstado) return;
    setGuardando(true);
    const res = await actualizarEstadoHerramienta(herramientaId, nuevoEstado, observaciones);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setEditandoId(null);
      setNuevoEstado('');
      setObservaciones('');
      await cargarHerramientas();
      await cargarBalance();
      mostrarExito('Estado actualizado');
    } else {
      setError(res.mensaje || 'Error al actualizar');
    }
  };

  // Cierra el balance del dia: el backend activa alerta en el mapa si hay diferencias
  const handleCerrarBalance = async () => {
    if (!window.confirm('Cerrar el balance del dia? Si hay herramientas danadas o perdidas se activara una alerta en el mapa.')) return;
    setGuardando(true);
    const res = await cerrarBalanceDia(cuadrillaId);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      await cargarBalance();
      mostrarExito('Balance cerrado. Las alertas han sido actualizadas en el mapa.');
    } else {
      setError(res.mensaje || 'Error al cerrar balance');
    }
  };

  // Herramientas filtradas por estado
  const herramientasFiltradas = filtroEstado === 'todos'
    ? herramientas
    : herramientas.filter((h) => h.estado === filtroEstado);

  // Cuadrilla actualmente seleccionada para mostrar su nombre en el titulo
  const cuadrillaActual = cuadrillas.find((c) => String(c.id) === cuadrillaId);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <Navbar />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 16px 32px' }}>

        {/* Cabecera con selectores de emergencia y cuadrilla */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#1a3a5c', fontSize: '22px', fontWeight: 'bold' }}>
            Control de Herramientas
          </h1>

          <select
            value={emergenciaId}
            onChange={(e) => { setEmergenciaId(e.target.value); setCuadrillaId(''); setHerramientas([]); setBalance(null); }}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
          >
            {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
            {emergencias.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>

          <select
            value={cuadrillaId}
            onChange={(e) => setCuadrillaId(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
          >
            {cuadrillas.length === 0 && <option value="">Sin cuadrillas</option>}
            {cuadrillas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        {/* Mensajes */}
        {error && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#fdecea', border: '1px solid #e74c3c', borderRadius: '6px', color: '#c0392b', fontSize: '13px' }}>
            {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontWeight: 'bold' }}>X</button>
          </div>
        )}
        {exito && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#eafaf1', border: '1px solid #27ae60', borderRadius: '6px', color: '#1e8449', fontSize: '13px' }}>
            {exito}
          </div>
        )}

        {cuadrillaId && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

            {/* Panel izquierdo: resumen del balance */}
            <div style={{ flex: '1', minWidth: '240px' }}>
              <div style={{ background: 'white', borderRadius: '8px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
                <h2 style={{ margin: '0 0 14px', fontSize: '15px', color: '#1a3a5c' }}>
                  Balance de herramientas
                </h2>
                {balance ? (
                  <>
                    {/* Tarjetas de resumen por estado */}
                    {[
                      { clave: 'entregadas', etiqueta: 'Entregadas', color: '#1a5276' },
                      { clave: 'buenas', etiqueta: 'Buenas', color: '#1e8449' },
                      { clave: 'danadas', etiqueta: 'Danadas', color: '#d35400' },
                      { clave: 'perdidas', etiqueta: 'Perdidas', color: '#c0392b' },
                      { clave: 'no_devueltas', etiqueta: 'No devueltas', color: '#6c3483' },
                      { clave: 'total', etiqueta: 'Total', color: '#333' },
                    ].map(({ clave, etiqueta, color }) => (
                      <div key={clave} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}>
                        <span style={{ color: '#555' }}>{etiqueta}</span>
                        <strong style={{ color }}>{balance[clave] ?? 0}</strong>
                      </div>
                    ))}

                    {/* Boton de cierre de balance solo si hay diferencias (danadas o perdidas) */}
                    {puedeEditar && (
                      <button
                        onClick={handleCerrarBalance}
                        disabled={guardando}
                        style={{
                          marginTop: '14px', width: '100%', padding: '8px',
                          background: '#1a3a5c', color: 'white',
                          border: 'none', borderRadius: '4px',
                          cursor: guardando ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold', fontSize: '13px',
                          opacity: guardando ? 0.7 : 1,
                        }}
                      >
                        Cerrar balance del dia
                      </button>
                    )}
                  </>
                ) : (
                  <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>Sin herramientas registradas aun.</p>
                )}
              </div>

              {/* Panel de registro de herramientas (jefe y coordinador) */}
              {puedeEditar && (
                <div style={{ background: 'white', borderRadius: '8px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <h2 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1a3a5c' }}>Registrar herramientas</h2>

                  {/* Selector de modo: individual o masivo */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {['individual', 'masivo'].map((modo) => (
                      <button
                        key={modo}
                        onClick={() => setModoRegistro(modo)}
                        style={{
                          padding: '4px 12px',
                          background: modoRegistro === modo ? '#1a3a5c' : '#ecf0f1',
                          color: modoRegistro === modo ? 'white' : '#555',
                          border: 'none', borderRadius: '4px',
                          cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                          textTransform: 'capitalize',
                        }}
                      >
                        {modo}
                      </button>
                    ))}
                  </div>

                  {modoRegistro === 'individual' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={nombreHerramienta}
                        onChange={(e) => setNombreHerramienta(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRegistrarIndividual()}
                        placeholder="Nombre de la herramienta"
                        style={{ flex: 1, padding: '7px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                      />
                      <button
                        onClick={handleRegistrarIndividual}
                        disabled={guardando}
                        style={{ padding: '7px 14px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                      >
                        Agregar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <textarea
                        value={nombresMultiples}
                        onChange={(e) => setNombresMultiples(e.target.value)}
                        rows={4}
                        placeholder="Un nombre por linea o separados por coma:&#10;martillo&#10;pala&#10;nivel"
                        style={{ width: '100%', padding: '7px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                      <button
                        onClick={handleRegistrarMasivo}
                        disabled={guardando}
                        style={{ marginTop: '8px', width: '100%', padding: '8px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                      >
                        {guardando ? 'Registrando...' : 'Registrar todas'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel derecho: lista de herramientas */}
            <div style={{ flex: '2', minWidth: '320px' }}>
              <div style={{ background: 'white', borderRadius: '8px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '15px', color: '#1a3a5c' }}>
                    {cuadrillaActual?.nombre} — {herramientas.length} herramientas
                  </h2>

                  {/* Filtro por estado */}
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    style={{ padding: '5px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
                  >
                    <option value="todos">Todos los estados</option>
                    {Object.entries(COLOR_ESTADO_HERRAMIENTA).map(([val, { etiqueta }]) => (
                      <option key={val} value={val}>{etiqueta}</option>
                    ))}
                  </select>
                </div>

                {cargando && <p style={{ color: '#888', fontSize: '13px' }}>Cargando...</p>}

                {!cargando && herramientasFiltradas.length === 0 && (
                  <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    No hay herramientas con este estado.
                  </p>
                )}

                {/* Lista de herramientas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {herramientasFiltradas.map((h) => {
                    const colorInfo = COLOR_ESTADO_HERRAMIENTA[h.estado] || COLOR_ESTADO_HERRAMIENTA.entregada;
                    const estaEditando = editandoId === h.id;
                    return (
                      <div
                        key={h.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: colorInfo.bg,
                          border: `1px solid ${colorInfo.texto}22`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', color: '#222', fontWeight: '500' }}>{h.nombre}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px',
                            background: colorInfo.texto, color: 'white',
                            fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap',
                          }}>
                            {colorInfo.etiqueta}
                          </span>
                          {/* El jefe y coordinador pueden cambiar el estado */}
                          {puedeEditar && h.estado !== 'buena' && h.estado !== 'danada' && h.estado !== 'perdida' && h.estado !== 'no_devuelta' && (
                            <button
                              onClick={() => { setEditandoId(h.id); setNuevoEstado('buena'); setObservaciones(''); }}
                              style={{ padding: '3px 8px', background: '#0099d6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Actualizar
                            </button>
                          )}
                          {puedeEditar && (h.estado === 'entregada' || h.estado === 'buena') && (
                            <button
                              onClick={() => { setEditandoId(estaEditando ? null : h.id); setNuevoEstado('danada'); setObservaciones(''); }}
                              style={{ padding: '3px 8px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Marcar dano/perdida
                            </button>
                          )}
                        </div>

                        {/* Observaciones si las tiene */}
                        {h.observaciones && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            Obs: {h.observaciones}
                          </div>
                        )}

                        {/* Formulario inline para cambiar el estado */}
                        {estaEditando && (
                          <div style={{ marginTop: '10px', padding: '10px', background: 'white', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <select
                              value={nuevoEstado}
                              onChange={(e) => setNuevoEstado(e.target.value)}
                              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                            >
                              <option value="buena">Buena - devuelta en buen estado</option>
                              <option value="danada">Danada - presenta danos</option>
                              <option value="perdida">Perdida - no se encontro</option>
                              <option value="no_devuelta">No devuelta - pendiente</option>
                            </select>
                            <input
                              type="text"
                              value={observaciones}
                              onChange={(e) => setObservaciones(e.target.value)}
                              placeholder="Observaciones del estado (opcional)"
                              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleGuardarEstado(h.id)}
                                disabled={guardando}
                                style={{ flex: 1, padding: '6px', background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditandoId(null)}
                                style={{ flex: 1, padding: '6px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {!cuadrillaId && !cargando && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888', fontSize: '15px' }}>
            Selecciona una emergencia y cuadrilla para ver sus herramientas.
          </div>
        )}
      </div>
    </div>
  );
}
