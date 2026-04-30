import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

function Inicio() {
  const [puntos, setPuntos] = useState('');

  // animación de puntos suspensivos para dar sensación de trabajo en progreso
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

      {/* navbar fijo arriba con el menú hamburguesa */}
      <Navbar />

      {/* contenido centrado de la página */}
      <div style={estilos.contenido}>
        <span style={estilos.icono}>🚧</span>
        <h1 style={estilos.titulo}>
          Estamos trabajando para mejorar tu experiencia{puntos}
        </h1>
        <p style={estilos.error}>(error 404)</p>
      </div>

    </div>
  );
}

const estilos = {
  contenedor: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
  },
  contenido: {
    // dejamos espacio arriba para que el navbar no tape el contenido
    paddingTop: '60px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '60px 2rem 2rem',
  },
  icono: {
    fontSize: '4rem',
    marginBottom: '1.5rem',
  },
  titulo: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1a3a5c',
    marginBottom: '1rem',
    // el minHeight evita que el layout salte con la animación de puntos
    minHeight: '2.5rem',
  },
  error: {
    fontSize: '0.9rem',
    color: '#aaa',
    fontStyle: 'italic',
  },
};

export default Inicio;
