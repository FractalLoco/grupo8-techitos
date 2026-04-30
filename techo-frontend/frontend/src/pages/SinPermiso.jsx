import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../context/AuthContext';

function SinPermiso() {
  const navegar = useNavigate();
  const { usuario, cerrarSesion } = useAutenticacion();

  const manejarCerrarSesion = () => {
    cerrarSesion();
    navegar('/auth/iniciar-sesion');
  };

  return (
    <div style={estilos.contenedor}>
      <img
        src="https://www.techo.org/chile/wp-content/uploads/sites/14/2021/08/logo-techo-chile.png"
        alt="TECHO Chile"
        style={estilos.logo}
        onError={(e) => (e.target.style.display = 'none')}
      />
      <h1 style={estilos.codigoError}>403</h1>
      <p style={estilos.mensajePrincipal}>Acceso denegado</p>
      <p style={estilos.mensajeSecundario}>
        No tienes permiso para acceder a esta sección.
        {usuario && ` Tu rol es: ${usuario.rol.replace('_', ' ')}.`}
      </p>
      <div style={estilos.contenedorBotones}>
        <button style={estilos.botonVolver} onClick={() => navegar(-1)}>
          Volver
        </button>
        <button style={estilos.botonCerrar} onClick={manejarCerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
    textAlign: 'center',
    padding: '2rem',
  },
  logo: {
    width: '140px',
    marginBottom: '2rem',
  },
  codigoError: {
    fontSize: '6rem',
    fontWeight: '800',
    color: '#e74c3c',
    margin: '0',
    lineHeight: '1',
  },
  mensajePrincipal: {
    fontSize: '1.4rem',
    fontWeight: '600',
    color: '#1a3a5c',
    marginTop: '1rem',
    marginBottom: '0.5rem',
  },
  mensajeSecundario: {
    fontSize: '1rem',
    color: '#888',
    marginBottom: '2rem',
  },
  contenedorBotones: {
    display: 'flex',
    gap: '1rem',
  },
  botonVolver: {
    backgroundColor: '#1a3a5c',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  botonCerrar: {
    backgroundColor: '#e74c3c',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default SinPermiso;
