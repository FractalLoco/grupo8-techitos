import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdClose, MdHome, MdLogout, MdMenu } from 'react-icons/md';
import { useAutenticacion } from '../context/AuthContext';

const MODULOS = [
  { nombre: 'Comunicaciones', ruta: '/comunicaciones', roles: ['coordinador', 'jefe_cuadrilla', 'voluntario'] },
  { nombre: 'Cuadrillas', ruta: '/cuadrillas', roles: ['coordinador', 'jefe_cuadrilla'] },
  { nombre: 'Mapa', ruta: '/mapa', roles: ['coordinador', 'jefe_cuadrilla', 'voluntario'] },
  { nombre: 'Emergencias', ruta: '/emergencias', roles: ['coordinador'] },
  { nombre: 'Herramientas', ruta: '/herramientas', roles: ['coordinador', 'jefe_cuadrilla'] },
  { nombre: 'Inventario', ruta: '/inventario', roles: ['coordinador'] },
  { nombre: 'Catálogo', ruta: '/catalogo', roles: ['coordinador', 'jefe_cuadrilla'] },
  { nombre: 'Solicitudes', ruta: '/solicitudes', roles: ['coordinador', 'jefe_cuadrilla'] },
  { nombre: 'Usuarios', ruta: '/usuarios', roles: ['coordinador'] },
  { nombre: 'Reportes', ruta: '/reportes', roles: ['coordinador'] },
];

const ETIQUETAS_ROL = {
  coordinador: 'Coordinador',
  jefe_cuadrilla: 'Jefe de cuadrilla',
  voluntario: 'Voluntario',
};

export default function Navbar() {
  const { usuario, cerrarSesion } = useAutenticacion();
  const location = useLocation();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const modulos = MODULOS.filter((modulo) => modulo.roles.includes(usuario?.rol));
  const salir = () => {
    cerrarSesion();
    setAbierto(false);
    navigate('/auth/iniciar-sesion', { replace: true });
  };

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-[3500] flex h-[60px] items-center justify-between bg-primary px-4 text-white shadow-lg sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Abrir navegación"
          >
            <MdMenu size={25} />
          </button>
        </div>
        <Link
          to="/inicio"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-label="Ir al inicio"
        >
          <img src="/logo.svg" alt="TECHO, un techo para Chile" className="h-11 w-auto max-w-[180px]" />
        </Link>
        <div className="hidden min-w-0 text-right sm:block">
          <p className="max-w-44 truncate text-sm font-semibold">{usuario?.nombre || 'Usuario'}</p>
          <p className="text-[11px] text-white/70">{ETIQUETAS_ROL[usuario?.rol] || usuario?.rol}</p>
        </div>
      </nav>

      {abierto && (
        <button
          type="button"
          className="fixed inset-0 z-[3600] bg-black/45"
          onClick={() => setAbierto(false)}
          aria-label="Cerrar navegación"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[3700] flex w-[290px] flex-col bg-neutral text-white shadow-2xl transition-transform duration-200 ${
        abierto ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-[60px] items-center justify-between border-b border-white/10 px-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">TECHO Chile</p>
            <h2 className="font-bold">Navegación</h2>
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"
            aria-label="Cerrar navegación"
          >
            <MdClose size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <Link
            to="/inicio"
            onClick={() => setAbierto(false)}
            className="mb-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
          >
            <MdHome size={20} />
            Inicio
          </Link>
          <div className="my-3 border-t border-white/10" />
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/45">Módulos</p>
          <div className="space-y-1">
            {modulos.map((modulo) => {
              const activo = location.pathname === modulo.ruta;
              return (
                <Link
                  key={modulo.ruta}
                  to={modulo.ruta}
                  onClick={() => setAbierto(false)}
                  className={`flex min-h-11 items-center rounded-xl px-3 text-sm transition ${
                    activo ? 'bg-primary font-semibold text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {modulo.nombre}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{usuario?.nombre || 'Usuario'}</p>
          <p className="text-xs text-white/50">{ETIQUETAS_ROL[usuario?.rol] || usuario?.rol}</p>
          <button
            type="button"
            onClick={salir}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-tertiary"
          >
            <MdLogout size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
