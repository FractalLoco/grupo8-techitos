import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../context/AuthContext';
import { login } from '../services/inicioSesionService';

function Login() {
  const [rut, setRut] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navegar = useNavigate();
  const { iniciarSesion } = useAutenticacion();

  // validar que el RUT tenga un formato básico correcto
  const validarRut = (rutIngresado) => {
    // acepta formatos: 12345678-9 o 123456789 o 12.345.678-9
    const rutRegex = /^(\d{1,2}\.)?(\d{3}\.)?(\d{3}[-]?[0-9K])$|^\d{7,8}[-]?[0-9K]$/i;
    return rutRegex.test(rutIngresado.trim());
  };

  const manejarInicioSesion = async (evento) => {
    evento.preventDefault();
    setMensajeError('');
    setCargando(true);

    // validación del lado del cliente
    if (!rut.trim()) {
      setMensajeError('Ingresa tu RUT para continuar');
      setCargando(false);
      return;
    }

    if (!contrasena.trim()) {
      setMensajeError('Ingresa tu contraseña para continuar');
      setCargando(false);
      return;
    }

    if (!validarRut(rut)) {
      setMensajeError('Formato de RUT inválido. Ejemplo: 12345678-9');
      setCargando(false);
      return;
    }

    try {
      // llamamos al service que hace el fetch al backend
      const datos = await login(rut, contrasena);

      // guardamos el token y el usuario en el contexto global
      iniciarSesion(datos.token, datos.usuario);

      navegar('/inicio');

    } catch (error) {
      // el service lanza un error con el mensaje que vino del backend
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.tarjeta}>

        <img
          src="https://www.techo.org/chile/wp-content/uploads/sites/14/2021/08/logo-techo-chile.png"
          alt="TECHO Chile"
          style={estilos.logo}
          onError={(e) => (e.target.style.display = 'none')}
        />

        <h2 style={estilos.titulo}>Iniciar Sesión</h2>
        <p style={estilos.subtitulo}>Dashboard Multifuncional</p>

        <form onSubmit={manejarInicioSesion} style={estilos.formulario}>

          <label style={estilos.etiqueta}>RUT</label>
          <input
            style={estilos.campoTexto}
            type="text"
            placeholder="12345678-9"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            required
          />

          <label style={estilos.etiqueta}>Contraseña</label>
          <input
            style={estilos.campoTexto}
            type="password"
            placeholder="••••••••"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />

          {/* solo mostramos el error si hay algo que mostrar */}
          {mensajeError && (
            <p style={estilos.mensajeError}>{mensajeError}</p>
          )}

          <button
            style={{ ...estilos.boton, opacity: cargando ? 0.7 : 1 }}
            type="submit"
            disabled={cargando}
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>

        </form>
      </div>
    </div>
  );
}

const estilos = {
  contenedor: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
  },
  tarjeta: {
    backgroundColor: '#fff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  logo: {
    width: '160px',
    marginBottom: '1rem',
  },
  titulo: {
    color: '#1a3a5c',
    marginBottom: '0.25rem',
    fontSize: '1.4rem',
  },
  subtitulo: {
    color: '#888',
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  formulario: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  etiqueta: {
    marginBottom: '4px',
    fontWeight: '600',
    color: '#333',
    fontSize: '0.9rem',
  },
  campoTexto: {
    padding: '10px 12px',
    marginBottom: '1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    outline: 'none',
  },
  mensajeError: {
    color: '#e74c3c',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    textAlign: 'center',
    backgroundColor: '#fdecea',
    padding: '8px',
    borderRadius: '6px',
  },
  boton: {
    backgroundColor: '#0099d6',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
};

export default Login;
