import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

function NotFound() {
  const navegar = useNavigate();
  const [puntos, setPuntos] = useState('');

  // animación de puntos para simular que algo está procesándose
  useEffect(() => {
    const intervalo = setInterval(() => {
      setPuntos((puntosActuales) => {
        if (puntosActuales.length >= 3) return '';
        return puntosActuales + '.';
      });
    }, 500);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div style={estilos.contenedor}>
      <img
        src="https://www.techo.org/chile/wp-content/uploads/sites/14/2021/08/logo-techo-chile.png"
        alt="TECHO Chile"
        style={estilos.logo}
        onError={(e) => (e.target.style.display = 'none')}
      />
      <span style={estilos.icono}>🚧</span>
      <h1 style={estilos.titulo}>
        Estamos trabajando para mejorar{puntos}
      </h1>
      <p style={estilos.mensajeSecundario}>
        Esta sección aún no está disponible o está en construcción.
      </p>
      <p style={estilos.codigoError}>(error 404)</p>
      <button style={estilos.boton} onClick={() => navegar('/auth/iniciar-sesion')}>
        Volver al inicio
      </button>
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
  icono: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  titulo: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1a3a5c',
    marginBottom: '0.75rem',
    minHeight: '2.5rem',
  },
  mensajeSecundario: {
    fontSize: '1rem',
    color: '#666',
    marginBottom: '0.4rem',
  },
  codigoError: {
    fontSize: '0.9rem',
    color: '#aaa',
    marginBottom: '2rem',
    fontStyle: 'italic',
  },
  boton: {
    backgroundColor: '#0099d6',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

export default NotFound;
