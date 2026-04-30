import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../context/AuthContext';

function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { usuario, cerrarSesion } = useAutenticacion();
  const navegar = useNavigate();

  const alternarMenu = () => setMenuAbierto(!menuAbierto);
  const cerrarMenu = () => setMenuAbierto(false);

  const manejarCierreSesion = () => {
    cerrarSesion();
    navegar('/auth/iniciar-sesion');
  };

  const etiquetaRol = {
    coordinador: 'Coordinador',
    jefe_cuadrilla: 'Jefe de Cuadrilla',
    voluntario: 'Voluntario',
  };

  return (
    <>
      <nav style={estilos.navbar}>
        <button style={estilos.botonHamburguesa} onClick={alternarMenu}>
          <span style={estilos.linea}></span>
          <span style={estilos.linea}></span>
          <span style={estilos.linea}></span>
        </button>

        {usuario && (
          <div style={estilos.infoUsuario}>
            <span style={estilos.nombreUsuario}>{usuario.nombre}</span>
            <span style={estilos.rolUsuario}>{etiquetaRol[usuario.rol] || usuario.rol}</span>
          </div>
        )}
      </nav>

      {menuAbierto && (
        <div style={estilos.fondo} onClick={cerrarMenu} />
      )}

      <div style={{ ...estilos.sidebar, left: menuAbierto ? '0' : '-280px' }}>
        <button style={estilos.botonCerrar} onClick={cerrarMenu}>✕</button>

        {usuario && (
          <div style={estilos.perfilSidebar}>
            <p style={estilos.nombreSidebar}>{usuario.nombre}</p>
            <p style={estilos.rolSidebar}>{etiquetaRol[usuario.rol] || usuario.rol}</p>
          </div>
        )}

        <div style={estilos.contenidoMenu}>
          <p style={estilos.textoProximamente}>Menú en construcción...</p>
        </div>

        <div style={estilos.pieSidebar}>
          <button style={estilos.botonCerrarSesion} onClick={manejarCierreSesion}>
            Cerrar sesión
          </button>
          <div style={estilos.contenedorLogo}>
            <img
              src="https://www.techo.org/chile/wp-content/uploads/sites/14/2021/08/logo-techo-chile.png"
              alt="TECHO Chile"
              style={estilos.logo}
              onError={(e) => (e.target.style.display = 'none')}
            />
          </div>
        </div>
      </div>
    </>
  );
}

const estilos = {
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#1a3a5c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  botonHamburguesa: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    padding: '4px',
  },
  linea: {
    display: 'block',
    width: '24px',
    height: '2px',
    backgroundColor: '#ffffff',
    borderRadius: '2px',
  },
  infoUsuario: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  nombreUsuario: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  rolUsuario: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.75rem',
  },
  fondo: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 200,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    width: '280px',
    backgroundColor: '#1a3a5c',
    zIndex: 300,
    transition: 'left 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
  },
  botonCerrar: {
    alignSelf: 'flex-end',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '4px 8px',
    marginBottom: '1rem',
  },
  perfilSidebar: {
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    paddingBottom: '1rem',
    marginBottom: '1rem',
  },
  nombreSidebar: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '1rem',
    margin: '0 0 4px 0',
  },
  rolSidebar: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.8rem',
    margin: 0,
  },
  contenidoMenu: {
    flex: 1,
  },
  textoProximamente: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  pieSidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  botonCerrarSesion: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: '600',
  },
  contenedorLogo: {
    borderTop: '1px solid rgba(255,255,255,0.15)',
    paddingTop: '1rem',
  },
  logo: {
    width: '120px',
    filter: 'brightness(0) invert(1)',
  },
};

export default Navbar;
