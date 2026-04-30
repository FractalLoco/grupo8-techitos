import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../context/AuthContext';

// este componente envuelve las páginas que solo pueden ver usuarios logueados
// si además se le pasan rolesPermitidos, también revisa que el rol coincida
function RutaProtegida({ children, rolesPermitidos }) {
  const { usuario, verificando } = useAutenticacion();

  // mientras el contexto verifica el token con el backend, mostramos una pantalla de carga
  // así evitamos que la página parpadee o redirija antes de tiempo
  if (verificando) {
    return (
      <div style={estilos.contenedorCarga}>
        <p style={estilos.textoCarga}>Verificando sesión...</p>
      </div>
    );
  }

  // si no hay usuario logueado lo mandamos al login
  if (!usuario) {
    return <Navigate to="/auth/iniciar-sesion" replace />;
  }

  // si la ruta tiene roles definidos y el usuario no califica, lo mandamos al 403
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/sin-permiso" replace />;
  }

  // si pasó todo, mostramos la página normalmente
  return children;
}

const estilos = {
  contenedorCarga: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
  },
  textoCarga: {
    color: '#888',
    fontSize: '1rem',
  },
};

export default RutaProtegida;
