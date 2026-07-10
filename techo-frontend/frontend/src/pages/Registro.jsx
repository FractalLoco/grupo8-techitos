// Importo useState para controlar cada campo del formulario y los estados de UI
import { useState } from 'react';
// Importo useNavigate para redirigir al login tras el registro exitoso
import { useNavigate, Link } from 'react-router-dom';
// Importo el servicio que envía los datos al endpoint de registro del backend
import { registrarUsuario } from '../services/inicioSesionService';

// Página de registro de nuevos usuarios.
// La cuenta se crea inactiva; el coordinador debe activarla antes de que el usuario pueda iniciar sesión.
function Registro() {
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  // Por defecto sugiero el rol voluntario ya que es el más común al registrarse
  const [rol, setRol] = useState('voluntario');
  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [cargando, setCargando] = useState(false);
  const navegar = useNavigate();

  // Valido el formato del RUT chileno con o sin puntos y con guión
  const validarRut = (rutIngresado) => {
    const rutRegex = /^(\d{1,2}\.)?(\d{3}\.)?(\d{3}[-]?[0-9K])$|^\d{7,8}[-]?[0-9K]$/i;
    return rutRegex.test(rutIngresado.trim());
  };

  // Proceso el formulario validando todos los campos antes de llamar al backend
  const manejarRegistro = async (evento) => {
    evento.preventDefault();
    setMensajeError('');
    setMensajeExito('');

    // Verifico que ningún campo obligatorio esté vacío
    if (!nombre.trim() || !rut.trim() || !correo.trim() || !contrasena.trim()) {
      setMensajeError('Todos los campos son obligatorios');
      return;
    }

    if (!validarRut(rut)) {
      setMensajeError('Formato de RUT inválido. Ejemplo: 12345678-9');
      return;
    }

    // Exijo mínimo 6 caracteres en la contraseña para cumplir con la validación del backend
    if (contrasena.length < 6) {
      setMensajeError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Confirmo que ambas contraseñas coincidan antes de enviar
    if (contrasena !== confirmarContrasena) {
      setMensajeError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);

    try {
      await registrarUsuario({ nombre, rut, correo, contrasena, rol });
      // Informo al usuario que debe esperar la activación del coordinador
      setMensajeExito('Usuario registrado correctamente. Revisa tu correo: enviamos tus credenciales. Espera la activación del coordinador.');
      // Limpio todos los campos del formulario tras el éxito
      setNombre('');
      setRut('');
      setCorreo('');
      setContrasena('');
      setConfirmarContrasena('');
      // Redirijo al login automáticamente después de 3 segundos
      setTimeout(() => navegar('/auth/iniciar-sesion'), 3000);
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-techo-primary via-techo-dark to-techo-primary">

      {/* Panel decorativo visible solo en escritorio */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-techo-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-techo-secondary rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 text-center text-white animate-fadeIn">
          <div className="mb-8 animate-float">
            <img
              src="/logo-techo-blanco-oficial.png"
              alt="TECHO Chile"
              className="w-48 mx-auto drop-shadow-2xl"
              onError={(e) => (e.target.style.display = 'none')}
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">Únete al Equipo</h1>
          <p className="text-lg text-gray-300 max-w-md mx-auto">
            Regístrate para formar parte de la gestión de emergencias y ayudar a las familias más vulnerables
          </p>
        </div>
      </div>

      {/* Formulario de registro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fadeIn">
          {/* Logo solo en móvil */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/logo-techo-blanco-oficial.png"
              alt="TECHO Chile"
              className="w-32 mx-auto"
              onError={(e) => (e.target.style.display = 'none')}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-techo-primary">Crear Cuenta</h2>
              <p className="text-gray-500 mt-1">Completa el formulario para registrarte</p>
            </div>

            <form onSubmit={manejarRegistro} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-techo-secondary focus:border-transparent outline-none transition-all"
                  type="text"
                  placeholder="Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">RUT</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-techo-secondary focus:border-transparent outline-none transition-all"
                  type="text"
                  placeholder="12345678-9"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Correo electrónico</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-techo-secondary focus:border-transparent outline-none transition-all"
                  type="email"
                  placeholder="correo@ejemplo.cl"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-techo-secondary focus:border-transparent outline-none transition-all"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar contraseña</label>
                <input
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-techo-secondary focus:border-transparent outline-none transition-all"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmarContrasena}
                  onChange={(e) => setConfirmarContrasena(e.target.value)}
                />
              </div>

              {/* El selector de rol no incluye 'coordinador' porque ese rol solo lo asigna un admin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-techo-secondary focus:border-transparent outline-none transition-all bg-white"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                >
                  <option value="voluntario">Voluntario</option>
                  <option value="jefe_cuadrilla">Jefe de Cuadrilla</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">El rol Coordinador solo puede ser asignado por un administrador</p>
              </div>

              {/* Muestro el error de validación o del backend si existe */}
              {mensajeError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center animate-fadeIn">
                  {mensajeError}
                </div>
              )}

              {/* Muestro el mensaje de éxito cuando el registro se completó correctamente */}
              {mensajeExito && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm text-center animate-fadeIn">
                  {mensajeExito}
                </div>
              )}

              <button
                className="w-full bg-techo-secondary hover:bg-techo-secondary/90 text-white py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                type="submit"
                disabled={cargando}
              >
                {cargando ? 'Registrando...' : 'Registrarme'}
              </button>
            </form>

            <div className="mt-5 text-center space-y-2">
              <Link to="/auth/iniciar-sesion" className="block text-techo-secondary hover:text-techo-secondary/80 text-sm font-medium">
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
              <Link to="/" className="block text-xs text-gray-300 hover:text-techo-primary transition-colors">
                ← Volver a la presentación
              </Link>
            </div>
          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            TECHO Chile — Dashboard Multifuncional
          </p>
        </div>
      </div>
    </div>
  );
}

export default Registro;
