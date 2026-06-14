// Pagina de gestion de cuadrillas: el coordinador las crea y administra,
// el jefe actualiza la fase y envia alertas.
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import {
  obtenerCuadrillasPorEmergencia,
  crearCuadrilla,
  agregarMiembro,
  eliminarMiembro,
  asignarObra,
  actualizarFase,
  enviarAlertaEmergencia,
  completarCuadrilla,
  reasignarVoluntario,
  obtenerObrasPorEmergencia,
} from '../services/cuadrillaService';
import { obtenerEmergencias } from '../services/emergenciaService';
import { obtenerUsuarios } from '../services/usuarioService';

// Color de borde izquierdo de cada tarjeta segun el estado de plazo
const COLORES_ESTADO = {
  verde: '#27ae60',
  amarillo: '#e67e22',
  rojo: '#e74c3c',
  gris: '#95a5a6',
  azul: '#3498db',
};

// Etiquetas para el selector de fase
const FASES = ['limpieza', 'montaje', 'terminaciones'];

// Estilos compartidos para botones de accion dentro de las tarjetas
const estiloBotonAccion = (color = '#1a3a5c') => ({
  padding: '5px 12px',
  background: color,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
});

export default function GestionCuadrillas() {
  const { usuario } = useAutenticacion();
  const esCoordinador = usuario?.rol === 'coordinador';
  const esJefe = usuario?.rol === 'jefe_cuadrilla';

  // Datos principales cargados desde el backend
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Cuadrilla cuya tarjeta esta expandida para mostrar acciones
  const [expandida, setExpandida] = useState(null);

  // Estado del modal de crear cuadrilla
  const [modalCrear, setModalCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({ nombre: '', jefe_id: '', plazo_dias: 5 });

  // Estado del modal de agregar miembro
  const [modalMiembro, setModalMiembro] = useState(null); // cuadrillaId
  const [voluntarioSeleccionado, setVoluntarioSeleccionado] = useState('');
  const [habilidades, setHabilidades] = useState('');

  // Estado del modal de asignar obra
  const [modalObra, setModalObra] = useState(null); // cuadrillaId
  const [obraSeleccionada, setObraSeleccionada] = useState('');

  // Estado del modal de alerta de emergencia (jefe)
  const [modalAlerta, setModalAlerta] = useState(null); // cuadrillaId
  const [descripcionAlerta, setDescripcionAlerta] = useState('');

  // Estado del modal de reasignar voluntario
  const [modalReasignar, setModalReasignar] = useState(null); // { cuadrillaId, voluntarioId }
  const [cuadrillaDestinoId, setCuadrillaDestinoId] = useState('');

  const [guardando, setGuardando] = useState(false);

  // Carga emergencias activas al montar la pagina
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

  // Cuando cambia la emergencia recargo cuadrillas, usuarios y obras disponibles
  useEffect(() => {
    if (!emergenciaId) return;
    setCargando(true);
    const promesas = [
      obtenerCuadrillasPorEmergencia(emergenciaId),
      obtenerObrasPorEmergencia(emergenciaId),
    ];
    // Los usuarios solo los puede ver el coordinador
    if (esCoordinador) promesas.push(obtenerUsuarios());

    Promise.all(promesas)
      .then(([resCuadrillas, resObras, resUsuarios]) => {
        setCuadrillas(resCuadrillas.datos?.cuadrillas || []);
        setObras(resObras.datos?.obras || []);
        if (resUsuarios) {
          const listaUsuarios = resUsuarios.datos?.usuarios || resUsuarios.datos || [];
          setUsuarios(Array.isArray(listaUsuarios) ? listaUsuarios : []);
        }
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setCargando(false));
  }, [emergenciaId, esCoordinador]);

  // Recarga solo las cuadrillas despues de una accion para no perder la seleccion de emergencia
  const recargarCuadrillas = async () => {
    const res = await obtenerCuadrillasPorEmergencia(emergenciaId);
    setCuadrillas(res.datos?.cuadrillas || []);
  };

  // Muestra un mensaje de exito que se borra solo
  const mostrarExito = (msg) => {
    setExito(msg);
    setTimeout(() => setExito(''), 3500);
  };

  // Envia el formulario de crear cuadrilla
  const handleCrearCuadrilla = async () => {
    if (!formCrear.nombre || !formCrear.jefe_id) {
      setError('El nombre y el jefe son obligatorios');
      return;
    }
    setGuardando(true);
    const res = await crearCuadrilla({
      nombre: formCrear.nombre,
      jefe_id: Number(formCrear.jefe_id),
      emergencia_id: Number(emergenciaId),
      plazo_dias: Number(formCrear.plazo_dias),
    });
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setModalCrear(false);
      setFormCrear({ nombre: '', jefe_id: '', plazo_dias: 5 });
      await recargarCuadrillas();
      mostrarExito('Cuadrilla creada correctamente');
    } else {
      setError(res.mensaje || 'Error al crear cuadrilla');
    }
  };

  // Agrega un voluntario a la cuadrilla; el backend devuelve error si supera 11
  const handleAgregarMiembro = async () => {
    if (!voluntarioSeleccionado) return;
    setGuardando(true);
    const res = await agregarMiembro(modalMiembro, Number(voluntarioSeleccionado), habilidades);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setModalMiembro(null);
      setVoluntarioSeleccionado('');
      setHabilidades('');
      await recargarCuadrillas();
      mostrarExito('Miembro agregado');
    } else {
      // El backend devuelve el mensaje de advertencia de limite maximo
      setError(res.mensaje || 'Error al agregar miembro');
    }
  };

  // Elimina un miembro; el backend valida el minimo de 10 integrantes
  const handleEliminarMiembro = async (cuadrillaId, voluntarioId) => {
    if (!window.confirm('Eliminar este miembro de la cuadrilla?')) return;
    const res = await eliminarMiembro(cuadrillaId, voluntarioId);
    if (res.estado === 'exitoso') {
      await recargarCuadrillas();
      mostrarExito('Miembro eliminado');
    } else {
      setError(res.mensaje || 'Error al eliminar miembro');
    }
  };

  // Asigna la obra seleccionada y notifica a los integrantes con las coordenadas
  const handleAsignarObra = async () => {
    if (!obraSeleccionada) return;
    setGuardando(true);
    const res = await asignarObra(modalObra, Number(obraSeleccionada));
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setModalObra(null);
      setObraSeleccionada('');
      await recargarCuadrillas();
      mostrarExito('Obra asignada. Los integrantes recibieron la notificacion con la ubicacion.');
    } else {
      setError(res.mensaje || 'Error al asignar obra');
    }
  };

  // El jefe actualiza la fase de avance de su propia cuadrilla
  const handleActualizarFase = async (cuadrillaId, fase) => {
    const res = await actualizarFase(cuadrillaId, fase);
    if (res.estado === 'exitoso') {
      await recargarCuadrillas();
      mostrarExito(`Fase actualizada a: ${fase}`);
    } else {
      setError(res.mensaje || 'Error al actualizar fase');
    }
  };

  // El jefe envia una alerta de emergencia al coordinador con descripcion del incidente
  const handleEnviarAlerta = async () => {
    if (!descripcionAlerta.trim()) {
      setError('Describe el incidente antes de enviar la alerta');
      return;
    }
    setGuardando(true);
    const res = await enviarAlertaEmergencia(modalAlerta, descripcionAlerta);
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setModalAlerta(null);
      setDescripcionAlerta('');
      await recargarCuadrillas();
      mostrarExito('Alerta enviada al coordinador');
    } else {
      setError(res.mensaje || 'Error al enviar alerta');
    }
  };

  // El coordinador marca la cuadrilla como completada y desarma al equipo
  const handleCompletarCuadrilla = async (cuadrillaId) => {
    if (!window.confirm('Marcar la cuadrilla como completada y liberar a los voluntarios?')) return;
    const res = await completarCuadrilla(cuadrillaId);
    if (res.estado === 'exitoso') {
      setExpandida(null);
      await recargarCuadrillas();
      mostrarExito('Cuadrilla completada. Los voluntarios quedaron disponibles.');
    } else {
      setError(res.mensaje || 'Error al completar cuadrilla');
    }
  };

  // El coordinador mueve un voluntario de una cuadrilla a otra
  const handleReasignar = async () => {
    if (!cuadrillaDestinoId) return;
    setGuardando(true);
    const res = await reasignarVoluntario(
      modalReasignar.cuadrillaId,
      modalReasignar.voluntarioId,
      Number(cuadrillaDestinoId)
    );
    setGuardando(false);
    if (res.estado === 'exitoso') {
      setModalReasignar(null);
      setCuadrillaDestinoId('');
      await recargarCuadrillas();
      mostrarExito('Voluntario reasignado');
    } else {
      setError(res.mensaje || 'Error al reasignar');
    }
  };

  // Filtra la cuadrilla que pertenece al jefe autenticado
  const cuadrillaDelJefe = cuadrillas.find((c) => c.jefe_id === usuario?.id);

  // El jefe solo ve su cuadrilla; el coordinador y voluntarios ven todas
  const cuadrillasMostradas = esJefe
    ? (cuadrillaDelJefe ? [cuadrillaDelJefe] : [])
    : cuadrillas;

  // Voluntarios disponibles para agregar a una cuadrilla (sin asignacion actual)
  const voluntariosDisponibles = usuarios.filter(
    (u) => u.rol === 'voluntario' && u.activo
  );
  const jefesDisponibles = usuarios.filter(
    (u) => u.rol === 'jefe_cuadrilla' && u.activo
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <Navbar />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '80px 16px 32px' }}>

        {/* Cabecera con titulo, selector de emergencia y boton crear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, color: '#1a3a5c', fontSize: '22px', fontWeight: 'bold' }}>
            Gestion de Cuadrillas
          </h1>

          {/* Selector de emergencia activa */}
          <select
            value={emergenciaId}
            onChange={(e) => { setEmergenciaId(e.target.value); setExpandida(null); }}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
          >
            {emergencias.length === 0 && <option value="">Sin emergencias activas</option>}
            {emergencias.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>

          {esCoordinador && (
            <button
              onClick={() => { setModalCrear(true); setError(''); }}
              style={{ ...estiloBotonAccion('#0099d6'), marginLeft: 'auto', padding: '7px 18px', fontSize: '14px' }}
            >
              + Nueva cuadrilla
            </button>
          )}
        </div>

        {/* Mensajes de retroalimentacion */}
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

        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando cuadrillas...</div>
        )}

        {!cargando && cuadrillasMostradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '15px' }}>
            {esJefe ? 'No tienes una cuadrilla asignada en esta emergencia.' : 'No hay cuadrillas en esta emergencia. Crea una para comenzar.'}
          </div>
        )}

        {/* Lista de tarjetas de cuadrillas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cuadrillasMostradas.map((cuadrilla) => {
            const colorBorde = COLORES_ESTADO[cuadrilla.estadoColor] || COLORES_ESTADO.azul;
            const estaExpandida = expandida === cuadrilla.id;
            const obraAsignada = obras.find((o) => o.id === cuadrilla.obra_asignada_id);
            const esMiCuadrilla = cuadrilla.jefe_id === usuario?.id;

            return (
              <div
                key={cuadrilla.id}
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  borderLeft: `5px solid ${colorBorde}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}
              >
                {/* Fila principal de la tarjeta */}
                <div
                  style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}
                  onClick={() => setExpandida(estaExpandida ? null : cuadrilla.id)}
                >
                  {/* Indicador de color con texto de estado */}
                  <span style={{
                    padding: '2px 10px',
                    background: colorBorde,
                    color: 'white',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {cuadrilla.estadoColor || 'sin asignar'}
                  </span>

                  <strong style={{ fontSize: '15px', color: '#1a3a5c', flex: 1 }}>{cuadrilla.nombre}</strong>

                  <span style={{ fontSize: '13px', color: '#555' }}>
                    Fase: <strong>{cuadrilla.fase || 'sin iniciar'}</strong>
                  </span>
                  <span style={{ fontSize: '13px', color: '#555' }}>
                    Integrantes: <strong>{cuadrilla.miembrosCount}</strong>
                  </span>
                  <span style={{ fontSize: '13px', color: '#555' }}>
                    Plazo: <strong>{cuadrilla.plazo_dias} dias</strong>
                  </span>

                  {/* Indicadores de alertas activas */}
                  {cuadrilla.alerta_emergencia && (
                    <span style={{ padding: '2px 8px', background: '#e74c3c', color: 'white', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                      ALERTA
                    </span>
                  )}
                  {cuadrilla.alerta_herramienta && (
                    <span style={{ padding: '2px 8px', background: '#f39c12', color: 'white', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                      HERRAMIENTAS
                    </span>
                  )}

                  <span style={{ color: '#aaa', fontSize: '13px' }}>{estaExpandida ? 'Ocultar' : 'Ver acciones'}</span>
                </div>

                {/* Panel expandido con detalles y acciones */}
                {estaExpandida && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid #f0f0f0' }}>

                    {/* Informacion de la obra asignada */}
                    <div style={{ marginTop: '12px', marginBottom: '12px', fontSize: '13px', color: '#444' }}>
                      {obraAsignada ? (
                        <div style={{ padding: '8px 12px', background: '#f8f9fa', borderRadius: '6px' }}>
                          <strong>Obra asignada:</strong> {obraAsignada.nombre}
                          <span style={{ marginLeft: '10px', color: '#888', fontSize: '12px' }}>
                            Lat: {obraAsignada.lat} | Lng: {obraAsignada.lng}
                          </span>
                          {obraAsignada.descripcion && (
                            <div style={{ marginTop: '2px', color: '#666' }}>{obraAsignada.descripcion}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#888' }}>Sin obra asignada aun</span>
                      )}
                    </div>

                    {/* Alertas activas con su descripcion */}
                    {cuadrilla.alerta_emergencia && (
                      <div style={{ marginBottom: '10px', padding: '8px 12px', background: '#fdecea', borderRadius: '6px', color: '#c0392b', fontSize: '13px' }}>
                        <strong>Alerta de emergencia:</strong> {cuadrilla.descripcion_emergencia}
                      </div>
                    )}
                    {cuadrilla.alerta_herramienta && (
                      <div style={{ marginBottom: '10px', padding: '8px 12px', background: '#fef9e7', borderRadius: '6px', color: '#d35400', fontSize: '13px' }}>
                        <strong>Alerta de herramientas:</strong> {cuadrilla.descripcion_alerta_herramienta}
                      </div>
                    )}

                    {/* Acciones disponibles segun el rol */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>

                      {/* El jefe actualiza la fase de su cuadrilla */}
                      {(esJefe && esMiCuadrilla) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>Fase:</span>
                          {FASES.map((f) => (
                            <button
                              key={f}
                              onClick={() => handleActualizarFase(cuadrilla.id, f)}
                              style={{
                                ...estiloBotonAccion(cuadrilla.fase === f ? '#1a3a5c' : '#7f8c8d'),
                                textTransform: 'capitalize',
                              }}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* El jefe envia una alerta de emergencia */}
                      {(esJefe && esMiCuadrilla) && (
                        <button
                          onClick={() => { setModalAlerta(cuadrilla.id); setError(''); }}
                          style={estiloBotonAccion('#e74c3c')}
                        >
                          Alerta de emergencia
                        </button>
                      )}

                      {/* Acciones exclusivas del coordinador */}
                      {esCoordinador && (
                        <>
                          {/* Asignar obra si no tiene una */}
                          {!cuadrilla.obra_asignada_id && (
                            <button
                              onClick={() => { setModalObra(cuadrilla.id); setError(''); }}
                              style={estiloBotonAccion('#0099d6')}
                            >
                              Asignar obra
                            </button>
                          )}

                          {/* Agregar miembro si no llego al maximo */}
                          {cuadrilla.miembrosCount < 11 && cuadrilla.estado !== 'completada' && (
                            <button
                              onClick={() => { setModalMiembro(cuadrilla.id); setError(''); }}
                              style={estiloBotonAccion('#27ae60')}
                            >
                              Agregar miembro
                            </button>
                          )}

                          {/* Completar y desarmar cuadrilla */}
                          {cuadrilla.estado !== 'completada' && (
                            <button
                              onClick={() => handleCompletarCuadrilla(cuadrilla.id)}
                              style={estiloBotonAccion('#7f8c8d')}
                            >
                              Marcar completada
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: crear cuadrilla */}
      {modalCrear && (
        <Modal titulo="Nueva cuadrilla" onCerrar={() => { setModalCrear(false); setError(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CampoFormulario label="Nombre de la cuadrilla">
              <input
                type="text"
                value={formCrear.nombre}
                onChange={(e) => setFormCrear((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Cuadrilla Norte"
                style={estiloInput}
              />
            </CampoFormulario>

            {/* Selector de jefe: solo usuarios con rol jefe_cuadrilla y cuenta activa */}
            <CampoFormulario label="Jefe de cuadrilla">
              <select
                value={formCrear.jefe_id}
                onChange={(e) => setFormCrear((f) => ({ ...f, jefe_id: e.target.value }))}
                style={estiloInput}
              >
                <option value="">Seleccionar jefe...</option>
                {jefesDisponibles.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rut})</option>
                ))}
              </select>
            </CampoFormulario>

            {/* Plazo: solo 2 o 5 dias segun la magnitud del trabajo (Req 1) */}
            <CampoFormulario label="Plazo de entrega">
              <select
                value={formCrear.plazo_dias}
                onChange={(e) => setFormCrear((f) => ({ ...f, plazo_dias: e.target.value }))}
                style={estiloInput}
              >
                <option value={2}>2 dias (trabajo menor)</option>
                <option value={5}>5 dias (trabajo mayor)</option>
              </select>
            </CampoFormulario>

            {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <BotonModal onClick={handleCrearCuadrilla} cargando={guardando} color="#1a3a5c">Crear cuadrilla</BotonModal>
              <BotonModal onClick={() => { setModalCrear(false); setError(''); }} color="#95a5a6">Cancelar</BotonModal>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: agregar miembro a cuadrilla */}
      {modalMiembro && (
        <Modal titulo="Agregar integrante" onCerrar={() => { setModalMiembro(null); setError(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              La cuadrilla debe tener entre 10 y 11 integrantes. El sistema rechazara la accion si supera el limite.
            </p>
            <CampoFormulario label="Voluntario">
              <select
                value={voluntarioSeleccionado}
                onChange={(e) => setVoluntarioSeleccionado(e.target.value)}
                style={estiloInput}
              >
                <option value="">Seleccionar voluntario...</option>
                {voluntariosDisponibles.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rut})</option>
                ))}
              </select>
            </CampoFormulario>
            <CampoFormulario label="Habilidades (opcional)">
              <input
                type="text"
                value={habilidades}
                onChange={(e) => setHabilidades(e.target.value)}
                placeholder="Ej: albanileria, electricidad..."
                style={estiloInput}
              />
            </CampoFormulario>
            {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <BotonModal onClick={handleAgregarMiembro} cargando={guardando} color="#27ae60">Agregar</BotonModal>
              <BotonModal onClick={() => { setModalMiembro(null); setError(''); }} color="#95a5a6">Cancelar</BotonModal>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: asignar obra a cuadrilla */}
      {modalObra && (
        <Modal titulo="Asignar obra" onCerrar={() => { setModalObra(null); setError(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Al asignar la obra los integrantes recibiran una notificacion con la ubicacion exacta y el plazo.
            </p>
            <CampoFormulario label="Obra">
              <select
                value={obraSeleccionada}
                onChange={(e) => setObraSeleccionada(e.target.value)}
                style={estiloInput}
              >
                <option value="">Seleccionar obra...</option>
                {obras.filter((o) => o.estado === 'disponible').map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre} — Lat: {o.lat}, Lng: {o.lng}
                  </option>
                ))}
              </select>
            </CampoFormulario>
            {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <BotonModal onClick={handleAsignarObra} cargando={guardando} color="#0099d6">Asignar y notificar</BotonModal>
              <BotonModal onClick={() => { setModalObra(null); setError(''); }} color="#95a5a6">Cancelar</BotonModal>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: alerta de emergencia desde el jefe */}
      {modalAlerta && (
        <Modal titulo="Alerta de emergencia" onCerrar={() => { setModalAlerta(null); setError(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#c0392b', fontWeight: 'bold' }}>
              Esta alerta llegara de inmediato al coordinador con la ubicacion exacta de la obra.
            </p>
            <CampoFormulario label="Descripcion del incidente">
              <textarea
                value={descripcionAlerta}
                onChange={(e) => setDescripcionAlerta(e.target.value)}
                rows={4}
                placeholder="Describe lo que esta ocurriendo: accidente, derrumbe, lesionado..."
                style={{ ...estiloInput, resize: 'vertical' }}
              />
            </CampoFormulario>
            {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <BotonModal onClick={handleEnviarAlerta} cargando={guardando} color="#e74c3c">Enviar alerta</BotonModal>
              <BotonModal onClick={() => { setModalAlerta(null); setError(''); }} color="#95a5a6">Cancelar</BotonModal>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: reasignar voluntario a otra cuadrilla */}
      {modalReasignar && (
        <Modal titulo="Reasignar voluntario" onCerrar={() => { setModalReasignar(null); setError(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CampoFormulario label="Cuadrilla destino">
              <select
                value={cuadrillaDestinoId}
                onChange={(e) => setCuadrillaDestinoId(e.target.value)}
                style={estiloInput}
              >
                <option value="">Seleccionar cuadrilla...</option>
                {cuadrillas
                  .filter((c) => c.id !== modalReasignar.cuadrillaId && c.estado !== 'completada')
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.miembrosCount} integrantes)</option>
                  ))}
              </select>
            </CampoFormulario>
            {error && <p style={{ color: '#e74c3c', fontSize: '13px', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <BotonModal onClick={handleReasignar} cargando={guardando} color="#f39c12">Reasignar</BotonModal>
              <BotonModal onClick={() => { setModalReasignar(null); setError(''); }} color="#95a5a6">Cancelar</BotonModal>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Componente de modal reutilizable dentro de la pagina
function Modal({ titulo, onCerrar, children }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white', padding: '28px', borderRadius: '8px',
        width: '420px', maxWidth: '92vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, color: '#1a3a5c', fontSize: '16px' }}>{titulo}</h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>X</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Campo de formulario con etiqueta
function CampoFormulario({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '4px' }}>{label}:</span>
      {children}
    </label>
  );
}

// Boton de accion dentro de modales
function BotonModal({ onClick, cargando, color, children }) {
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      style={{
        flex: 1, padding: '9px',
        background: color, color: 'white',
        border: 'none', borderRadius: '4px',
        cursor: cargando ? 'not-allowed' : 'pointer',
        fontWeight: 'bold', fontSize: '13px',
        opacity: cargando ? 0.7 : 1,
      }}
    >
      {cargando ? 'Procesando...' : children}
    </button>
  );
}

// Estilo reutilizable para inputs y selects de formulario
const estiloInput = {
  display: 'block', width: '100%', padding: '7px',
  borderRadius: '4px', border: '1px solid #ccc',
  fontSize: '13px', boxSizing: 'border-box',
};
