// Importo las herramientas de React para crear el contexto global de autenticación
import { createContext, useContext, useState, useEffect } from 'react';
// Importo la función que consulta al backend si el token sigue siendo válido
import { verificarSesion } from '../services/inicioSesionService';

// Creo el contexto que comparte el estado de sesión con toda la aplicación
const ContextoAutenticacion = createContext();

// Este proveedor envuelve la app y expone el usuario, token y las funciones de sesión
export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  // Uso esta bandera para bloquear las rutas protegidas mientras verifico la sesión guardada
  const [verificando, setVerificando] = useState(true);

  // Al montar la app reviso si el usuario ya tenía una sesión guardada en localStorage
  useEffect(() => {
    const tokenGuardado = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');

    if (tokenGuardado && usuarioGuardado) {
      // Consulto al backend para confirmar que el token no expiró desde la última visita
      verificarSesion(tokenGuardado)
        .then((valido) => {
          if (valido) {
            // El token sigue activo: restauro la sesión sin pedirle credenciales al usuario
            setToken(tokenGuardado);
            setUsuario(JSON.parse(usuarioGuardado));
          } else {
            // El token venció: limpio el storage para forzar un nuevo inicio de sesión
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
          }
        })
        .catch(() => {
          // Si el backend no responde, limpio igual por seguridad
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
        })
        .finally(() => setVerificando(false));
    } else {
      // No hay sesión guardada: termino la verificación de inmediato
      setVerificando(false);
    }
  }, []);

  // Guardo el token y el usuario tanto en el estado de React como en localStorage
  // para que la sesión sobreviva recargas de página
  const iniciarSesion = (nuevoToken, nuevoUsuario) => {
    localStorage.setItem('token', nuevoToken);
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  };

  // Limpio completamente la sesión del estado y del almacenamiento local
  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  };

  return (
    <ContextoAutenticacion.Provider value={{ usuario, token, verificando, iniciarSesion, cerrarSesion }}>
      {children}
    </ContextoAutenticacion.Provider>
  );
}

// Expongo este hook para que cualquier componente acceda al contexto sin importar el objeto directamente
export function useAutenticacion() {
  return useContext(ContextoAutenticacion);
}
