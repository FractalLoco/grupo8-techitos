// Importo los componentes de React Router para manejar la navegación entre páginas
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Envuelvo toda la app con el proveedor de autenticación para que cualquier componente acceda al usuario
import { ProveedorAutenticacion } from './context/AuthContext';
// Importo el guardián de rutas que bloquea el acceso según autenticación y rol
import RutaProtegida from './components/RutaProtegida';
// Importo el componente genérico para páginas aún en construcción
import Proximamente from './components/Próximamente';
// Importo todas las páginas de la aplicación
import Login from './pages/Login';
import Registro from './pages/Registro';
import Inicio from './pages/Inicio';
import Comunicaciones from './pages/Comunicaciones';
import SinPermiso from './pages/SinPermiso';
import GestionEmergencias from './pages/GestionEmergencias';
import NotFound from './pages/NotFound';
import GestionUsuarios from './pages/GestionUsuarios';

function Aplicacion() {
  return (
    // Coloco el proveedor de autenticación como raíz para que el estado del usuario
    // esté disponible en todas las rutas sin necesidad de pasarlo por props
    <ProveedorAutenticacion>
      <BrowserRouter>
        <Routes>
          {/* Redirijo la raíz directamente al login para que nadie aterrice en una página vacía */}
          <Route path="/" element={<Navigate to="/auth/iniciar-sesion" replace />} />

          {/* Rutas públicas: no requieren sesión iniciada */}
          <Route path="/auth/iniciar-sesion" element={<Login />} />
          <Route path="/auth/registro" element={<Registro />} />

          {/* Inicio está protegida: cualquier rol válido puede acceder, pero debe estar autenticado */}
          <Route
            path="/inicio"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla', 'voluntario']}>
                <Inicio />
              </RutaProtegida>
            }
          />

          <Route
            path="/comunicaciones"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla', 'voluntario']}>
                <Comunicaciones />
              </RutaProtegida>
            }
          />

          {/* Estas secciones aún están en desarrollo; uso Próximamente como placeholder */}
          <Route path="/cuadrillas" element={<Proximamente titulo="Gestión de Cuadrillas" />} />
          <Route path="/mapa" element={<Proximamente titulo="Mapa Interactivo" />} />
          <Route path="/emergencias" element={<GestionEmergencias />}/>
          <Route path="/herramientas" element={<Proximamente titulo="Control de Herramientas" />} />

          <Route
            path="/usuarios"
            element={
              <RutaProtegida rolesPermitidos={['coordinador']}>
                <GestionUsuarios />
              </RutaProtegida>
            }
          />

          {/* Muestro esta página cuando el middleware de roles rechaza el acceso */}
          <Route path="/sin-permiso" element={<SinPermiso />} />

          {/* Capturo cualquier ruta desconocida con el 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ProveedorAutenticacion>
  );
}

export default Aplicacion;
