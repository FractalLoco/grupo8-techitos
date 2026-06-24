import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAutenticacion } from '../context/AuthContext';
import { obtenerEmergencias } from '../services/emergenciaService';
import {
  validarEmergencia,
  generarReporte,
  descargarPDF,
  listarReportes,
} from '../services/reporteService';

function Reportes() {
  const { usuario } = useAutenticacion();
  const [emergencias, setEmergencias] = useState([]);
  const [emergenciaId, setEmergenciaId] = useState('');
  const [cargandoEmergencias, setCargandoEmergencias] = useState(true);

  // Validación
  const [validacion, setValidacion] = useState(null);
  const [validando, setValidando] = useState(false);

  // Generación
  const [generando, setGenerando] = useState(false);
  const [reporteGenerado, setReporteGenerado] = useState(null);
  const [errorGeneracion, setErrorGeneracion] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [advertenciasPendientes, setAdvertenciasPendientes] = useState([]);

  // Historial
  const [reportes, setReportes] = useState([]);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);

  // Snapshot
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    cargarEmergencias();
  }, []);

  useEffect(() => {
    if (emergenciaId) {
      setValidacion(null);
      setReporteGenerado(null);
      setErrorGeneracion(null);
      setSnapshot(null);
      cargarReportes(emergenciaId);
    } else {
      setReportes([]);
    }
  }, [emergenciaId]);

  async function cargarEmergencias() {
    setCargandoEmergencias(true);
    try {
      const data = await obtenerEmergencias();
      const lista = data?.datos?.emergencias || data?.datos || data || [];
      setEmergencias(Array.isArray(lista) ? lista : []);
    } catch {
      setEmergencias([]);
    } finally {
      setCargandoEmergencias(false);
    }
  }

  async function cargarReportes(id) {
    setCargandoReportes(true);
    try {
      const data = await listarReportes(id);
      const lista = data?.reportes || data || [];
      setReportes(Array.isArray(lista) ? lista : []);
    } catch {
      setReportes([]);
    } finally {
      setCargandoReportes(false);
    }
  }

  async function manejarValidar() {
    if (!emergenciaId) return;
    setValidando(true);
    setValidacion(null);
    setErrorGeneracion(null);
    try {
      const resultado = await validarEmergencia(emergenciaId);
      setValidacion(resultado);
    } catch (error) {
      setValidacion({ completo: false, advertencias: [], error: error.message });
    } finally {
      setValidando(false);
    }
  }

  async function manejarGenerar(confirmar = false) {
    if (!emergenciaId) return;
    setGenerando(true);
    setErrorGeneracion(null);
    setReporteGenerado(null);
    setSnapshot(null);
    try {
      const resultado = await generarReporte(emergenciaId, confirmar);
      setReporteGenerado(resultado.reporte || resultado);
      setSnapshot(resultado.reporte?.datos_snapshot || null);
      setMostrarConfirmacion(false);
      await cargarReportes(emergenciaId);
    } catch (error) {
      if (error.status === 409) {
        setAdvertenciasPendientes(error.advertencias || []);
        setMostrarConfirmacion(true);
      } else {
        setErrorGeneracion(error.message || 'Error al generar el reporte');
      }
    } finally {
      setGenerando(false);
    }
  }

  async function manejarConfirmarGenerar() {
    await manejarGenerar(true);
  }

  async function manejarDescargar(reporte) {
    setDescargandoId(reporte.id);
    try {
      await descargarPDF(reporte.id, reporte.nombre_archivo);
    } catch (error) {
      console.error('Error al descargar:', error);
    } finally {
      setDescargandoId(null);
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const emergenciaSeleccionada = emergencias.find(
    (e) => String(e.id) === String(emergenciaId),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-[60px]">
        <div className="bg-gradient-to-r from-techo-primary via-techo-primaryDark to-techo-dark px-8 py-6">
          <p className="text-techo-secondary text-xs font-bold uppercase tracking-widest mb-1">
            Reportes
          </p>
          <h1 className="text-white font-black text-2xl tracking-tight">
            Módulo de Reportes
          </h1>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Selector de emergencia */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <label className="block text-xs font-bold text-techo-primary uppercase tracking-widest mb-3">
              Seleccionar emergencia
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={emergenciaId}
                onChange={(e) => setEmergenciaId(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-techo-secondary focus:border-transparent"
                disabled={cargandoEmergencias}
              >
                <option value="">{cargandoEmergencias ? 'Cargando...' : '— Selecciona una emergencia —'}</option>
                {emergencias.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} ({e.estado})
                  </option>
                ))}
              </select>

              <button
                onClick={manejarValidar}
                disabled={!emergenciaId || validando}
                className="px-6 py-2.5 bg-techo-secondary text-white text-sm font-semibold rounded-xl hover:bg-techo-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                {validando ? 'Validando...' : 'Validar información'}
              </button>
            </div>

            {emergenciaSeleccionada && (
              <p className="mt-3 text-xs text-gray-400">
                {emergenciaSeleccionada.descripcion || 'Sin descripción'}
              </p>
            )}
          </section>

          {/* Resultado de validación */}
          {validacion && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                {validacion.completo ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <h2 className="text-sm font-bold text-green-700">Datos completos</h2>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <h2 className="text-sm font-bold text-amber-700">Se encontraron advertencias</h2>
                  </>
                )}
              </div>

              {validacion.error && (
                <p className="text-sm text-red-600 mb-3">{validacion.error}</p>
              )}

              {validacion.advertencias?.length > 0 && (
                <div className="space-y-2 mb-4">
                  {validacion.advertencias.map((adv, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                      <div>
                        <p className="text-xs font-semibold text-amber-800 uppercase">
                          [{adv.tipo}] #{adv.entidad_id}
                        </p>
                        <p className="text-xs text-amber-700">{adv.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {validacion.completo && (
                <p className="text-xs text-green-600 mb-4">
                  La emergencia tiene toda la información necesaria para generar un reporte.
                </p>
              )}
            </section>
          )}

          {/* Botón generar reporte */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-xs font-bold text-techo-primary uppercase tracking-widest">
                  Generar reporte PDF
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {emergenciaId
                    ? `Se generará un reporte para: ${emergenciaSeleccionada?.nombre || ''}`
                    : 'Selecciona una emergencia primero'}
                </p>
              </div>
              <button
                onClick={() => manejarGenerar(false)}
                disabled={!emergenciaId || generando}
                className="px-6 py-2.5 bg-techo-primary text-white text-sm font-semibold rounded-xl hover:bg-techo-primaryDark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {generando ? 'Generando...' : 'Generar reporte PDF'}
              </button>
            </div>

            {/* Barra de progreso durante la generación */}
            {generando && (
              <div className="mt-4 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-techo-secondary h-full rounded-full animate-pulse w-3/4" />
              </div>
            )}
          </section>

          {/* Modal de confirmación para advertencias */}
          {mostrarConfirmacion && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fadeInUp">
                <span className="text-3xl block text-center mb-3">⚠</span>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                  ¿Generar con advertencias?
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  La emergencia tiene {advertenciasPendientes.length} advertencia(s)
                  sin resolver. El reporte se generará con los datos disponibles.
                </p>
                {advertenciasPendientes.length > 0 && (
                  <div className="max-h-32 overflow-y-auto mb-4 space-y-1">
                    {advertenciasPendientes.map((adv, i) => (
                      <p key={i} className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                        [{adv.tipo}] {adv.descripcion}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setMostrarConfirmacion(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={manejarConfirmarGenerar}
                    disabled={generando}
                    className="flex-1 px-4 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all"
                  >
                    {generando ? 'Generando...' : 'Generar igualmente'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error de generación */}
          {errorGeneracion && (
            <section className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <p className="text-sm font-semibold text-red-700">{errorGeneracion}</p>
              </div>
            </section>
          )}

          {/* Reporte generado con éxito */}
          {reporteGenerado && (
            <section className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <h2 className="text-sm font-bold text-green-700">Reporte generado correctamente</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Archivo</p>
                  <p className="font-medium text-gray-800 truncate">{reporteGenerado.nombre_archivo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Fecha</p>
                  <p className="font-medium text-gray-800">{formatearFecha(reporteGenerado.generado_en)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ID</p>
                  <p className="font-medium text-gray-800">#{reporteGenerado.id}</p>
                </div>
              </div>
              <button
                onClick={() => manejarDescargar(reporteGenerado)}
                className="mt-4 px-5 py-2 bg-techo-secondary text-white text-sm font-semibold rounded-xl hover:bg-techo-secondary/90 transition-all"
              >
                Descargar PDF
              </button>
            </section>
          )}

          {/* Snapshot */}
          {snapshot && (
            <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="text-xs font-bold text-techo-primary uppercase tracking-widest mb-4">
                Vista del snapshot
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                <div className="bg-techo-light rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-techo-primary">{snapshot.indicadores?.cuadrillas_desplegadas ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Cuadrillas</p>
                </div>
                <div className="bg-techo-light rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-techo-primary">{snapshot.indicadores?.voluntarios_desplegados ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Voluntarios</p>
                </div>
                <div className="bg-techo-light rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-techo-primary">{snapshot.indicadores?.familias_registradas ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Familias</p>
                </div>
                <div className="bg-techo-light rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-techo-primary">{snapshot.indicadores?.personas_beneficiadas ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Beneficiados</p>
                </div>
                <div className="bg-techo-light rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-techo-primary">{snapshot.indicadores?.obras_finalizadas ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Obras finalizadas</p>
                </div>
              </div>

              <details className="group">
                <summary className="text-xs font-semibold text-techo-secondary cursor-pointer hover:text-techo-primary transition-colors">
                  Ver detalle completo del snapshot
                </summary>
                <pre className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 overflow-auto max-h-80 border border-gray-100">
                  {JSON.stringify(snapshot, null, 2)}
                </pre>
              </details>
            </section>
          )}

          {/* Historial de reportes */}
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-xs font-bold text-techo-primary uppercase tracking-widest mb-4">
              Historial de reportes
              {emergenciaId && (
                <span className="ml-2 text-gray-400 font-normal normal-case">
                  — {emergenciaSeleccionada?.nombre || ''}
                </span>
              )}
            </h2>

            {!emergenciaId && (
              <p className="text-sm text-gray-400 py-4 text-center">
                Selecciona una emergencia para ver su historial de reportes.
              </p>
            )}

            {emergenciaId && cargandoReportes && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-techo-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {emergenciaId && !cargandoReportes && reportes.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">
                No hay reportes generados para esta emergencia.
              </p>
            )}

            {reportes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-2 text-xs font-bold text-gray-400 uppercase">ID</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-gray-400 uppercase">Archivo</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-gray-400 uppercase">Generado por</th>
                      <th className="text-left py-3 px-2 text-xs font-bold text-gray-400 uppercase">Fecha</th>
                      <th className="text-center py-3 px-2 text-xs font-bold text-gray-400 uppercase">Descargar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-2 text-gray-500 font-mono text-xs">#{r.id}</td>
                        <td className="py-3 px-2 font-medium text-gray-800 truncate max-w-[160px]">
                          {r.nombre_archivo}
                        </td>
                        <td className="py-3 px-2 text-gray-600 text-xs">
                          {r.generadoPor?.nombre || '—'}
                        </td>
                        <td className="py-3 px-2 text-gray-500 text-xs">
                          {formatearFecha(r.generado_en)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => manejarDescargar(r)}
                            disabled={descargandoId === r.id}
                            className="px-3 py-1.5 bg-techo-secondary/10 text-techo-secondary text-xs font-semibold rounded-lg hover:bg-techo-secondary/20 disabled:opacity-50 transition-all"
                          >
                            {descargandoId === r.id ? 'Descargando...' : 'Descargar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Reportes;
