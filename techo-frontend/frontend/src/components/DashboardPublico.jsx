import { useCallback, useEffect, useRef, useState } from 'react';

const URL_BASE = import.meta.env.VITE_URL_BACKEND || 'http://localhost:3000';

/* ── Iconos SVG inline ─────────────────────────────────────────────────── */

function IconoCasa() {
  return (
    <svg className="w-8 h-8 text-techo-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconoVoluntario() {
  return (
    <svg className="w-8 h-8 text-techo-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconoCuadrilla() {
  return (
    <svg className="w-8 h-8 text-techo-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconoEmergencia() {
  return (
    <svg className="w-8 h-8 text-techo-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/80 border border-gray-100 px-5 py-4 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-7 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-8 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

/* ── Tarjeta de métrica ─────────────────────────────────────────────────── */

function TarjetaMetrica({ etiqueta, valor, icono }) {
  return (
    <div className="rounded-xl bg-white/80 border border-gray-100 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{etiqueta}</p>
          <p className="text-2xl font-bold text-techo-primary mt-0.5 tabular-nums">{valor}</p>
        </div>
        <div className="flex-shrink-0">{icono}</div>
      </div>
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────────────────── */

function DashboardPublico() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const controlador = useRef(null);

  const cargar = useCallback(async () => {
    const abortController = new AbortController();
    controlador.current = abortController;

    try {
      setCargando(true);
      setError('');

      const respuesta = await fetch(`${URL_BASE}/api/dashboard/publico`, {
        signal: abortController.signal,
      });
      const cuerpo = await respuesta.json();

      if (abortController.signal.aborted) return;

      if (!respuesta.ok) {
        throw new Error(cuerpo.mensaje || 'Error del servidor');
      }

      setDatos(cuerpo.datos);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!abortController.signal.aborted) {
        setError(err.message);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setCargando(false);
      }
    }
  }, []);

  useEffect(() => {
    cargar();
    return () => controlador.current?.abort();
  }, [cargar]);

  /* ── Formatear fecha ──────────────────────────────────────────────────── */

  const formatearFecha = (iso) => {
    if (!iso) return null;
    try {
      return new Intl.DateTimeFormat('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(iso));
    } catch {
      return null;
    }
  };

  const fechaFormateada = datos ? formatearFecha(datos.ultima_actualizacion) : null;

  /* ── Estados ──────────────────────────────────────────────────────────── */

  if (cargando) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Cargando indicadores">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center" role="alert">
        <svg className="w-8 h-8 text-red-400 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-sm font-medium text-red-700">
          No fue posible cargar los indicadores en este momento
        </p>
        <p className="text-xs text-red-400 mt-1 mb-4">{error}</p>
        <button
          onClick={cargar}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Reintentar
        </button>
      </div>
    );
  }

  if (!datos) return null;

  /* ── Render completo ──────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <TarjetaMetrica etiqueta="Casas finalizadas" valor={datos.casas_finalizadas} icono={<IconoCasa />} />
        <TarjetaMetrica etiqueta="Voluntarios desplegados" valor={datos.voluntarios_desplegados} icono={<IconoVoluntario />} />
        <TarjetaMetrica etiqueta="Cuadrillas activas" valor={datos.cuadrillas_activas} icono={<IconoCuadrilla />} />
        <TarjetaMetrica etiqueta="Emergencias activas" valor={datos.emergencias_activas} icono={<IconoEmergencia />} />
      </div>

      {/* Última actualización y estado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <p className="text-gray-400">
          Última actualización:{' '}
          <span className="font-medium text-gray-500">
            {fechaFormateada || 'Sin actualizaciones registradas'}
          </span>
        </p>

        {datos.aviso ? (
          <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {datos.aviso}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            Información operativa actualizada
          </span>
        )}
      </div>

    </div>
  );
}

export default DashboardPublico;
