import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAutenticacion } from '../context/AuthContext';
import { login } from '../services/inicioSesionService';

function Login() {
  const [rut, setRut] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const navegar = useNavigate();
  const { iniciarSesion } = useAutenticacion();

  // Valido el formato del RUT chileno antes de enviarlo al backend
  const validarRut = (rutIngresado) => {
    const rutRegex = /^(\d{1,2}\.)?(\d{3}\.)?(\d{3}[-]?[0-9K])$|^\d{7,8}[-]?[0-9K]$/i;
    return rutRegex.test(rutIngresado.trim());
  };

  // Manejo el envío del formulario: valido los campos localmente antes de llamar al backend
  const manejarInicioSesion = async (evento) => {
    evento.preventDefault();
    setMensajeError('');
    setCargando(true);

    // Valido los campos antes de hacer cualquier petición de red
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
      // Si el login es exitoso, guardo la sesión en el contexto y navego al panel principal
      const datos = await login(rut, contrasena);
      iniciarSesion(datos.token, datos.usuario);
      navegar('/inicio');
    } catch (error) {
      // Muestro el mensaje de error que viene del backend (ej: credenciales incorrectas)
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-techo-light px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <img
            src="/logo.svg"
            alt="TECHO Chile"
            className="w-16 mx-auto mb-4"
            onError={(e) => (e.target.style.display = 'none')}
          />
          <p className="text-xs font-semibold tracking-widest text-techo-secondary uppercase mb-1">TECHO Chile</p>
          <h1 className="text-2xl font-bold text-techo-primary">Iniciar Sesión</h1>
          <p className="text-sm text-gray-400 mt-1">Ingresa tus credenciales para continuar</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={manejarInicioSesion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">RUT</label>
              <input
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-techo-primary/20 focus:border-techo-primary outline-none transition-all"
                type="text"
                placeholder="12345678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-techo-primary/20 focus:border-techo-primary outline-none transition-all pr-10"
                  type={mostrarContrasena ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                >
                  {mostrarContrasena ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {mensajeError && (
              <p className="text-red-500 text-xs text-center">{mensajeError}</p>
            )}

            <button
              className="w-full bg-techo-primary hover:bg-techo-primary/90 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              type="submit"
              disabled={cargando}
            >
              {cargando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <Link to="/auth/registro" className="block text-xs text-gray-400 hover:text-techo-primary transition-colors">
              ¿No tienes cuenta? Regístrate aquí
            </Link>
            <Link to="/" className="block text-xs text-gray-300 hover:text-techo-primary transition-colors">
              ← Volver a la presentación
            </Link>
          </div>
        </div>

        <p className="text-center text-gray-300 text-xs mt-6">
          TECHO Chile — Dashboard Multifuncional
        </p>
      </div>
    </div>
  );
}

export default Login;
