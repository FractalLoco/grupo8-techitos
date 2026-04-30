import { createContext, useContext, useState, useEffect } from 'react';
import { verificarSesion } from '../services/inicioSesionService';

// contexto global para manejar la sesión del usuario en toda la app
const ContextoAutenticacion = createContext();

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [verificando, setVerificando] = useState(true);

  // al cargar la app revisamos si el usuario ya tenía sesión abierta
  useEffect(() => {
    const tokenGuardado = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');

    if (tokenGuardado && usuarioGuardado) {
      // le preguntamos al backend si el token guardado sigue siendo válido
      verificarSesion(tokenGuardado)
        .then((valido) => {
          if (valido) {
            setToken(tokenGuardado);
            setUsuario(JSON.parse(usuarioGuardado));
          } else {
            // el token venció, limpiamos todo para que vuelva a loguearse
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
          }
        })
        .catch(() => {
          // si el servidor no responde, limpiamos igual
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
        })
        .finally(() => setVerificando(false));
    } else {
      setVerificando(false);
    }
  }, []);

  // guardamos en estado y en localStorage para que sobreviva recargas de página
  const iniciarSesion = (nuevoToken, nuevoUsuario) => {
    localStorage.setItem('token', nuevoToken);
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  };

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

// hook para usar el contexto fácilmente desde cualquier componente
export function useAutenticacion() {
  return useContext(ContextoAutenticacion);
}
