// Importo los componentes de React Router para manejar la navegación entre páginas
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Envuelvo toda la app con el proveedor de autenticación para que cualquier componente acceda al usuario
import { ProveedorAutenticacion } from './context/AuthContext';
// Importo el guardián de rutas que bloquea el acceso según autenticación y rol
import RutaProtegida from './components/RutaProtegida';
// Importo el componente genérico para páginas aún en construcción
import Proximamente from './components/Próximamente';
// Importo todas las páginas de la aplicación
import Presentacion from './pages/Presentacion';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Inicio from './pages/Inicio';
import Comunicaciones from './pages/Comunicaciones';
import SinPermiso from './pages/SinPermiso';
import GestionEmergencias from './pages/GestionEmergencias';
import NotFound from './pages/NotFound';
import GestionUsuarios from './pages/GestionUsuarios';
import GestionCuadrillas from './pages/GestionCuadrillas';
import MapaInteractivo from './pages/MapaInteractivo';
import GestionHerramientas from './pages/GestionHerramientas';
import GestionInventario from './pages/GestionInventario';
import CatalogoInventario from './pages/CatalogoInventario';
import SolicitudesHerramientas from './pages/SolicitudesHerramientas';
import Reportes from './pages/Reportes';

function Aplicacion() {
  return (
    // Coloco el proveedor de autenticación como raíz para que el estado del usuario
    // esté disponible en todas las rutas sin necesidad de pasarlo por props
    <ProveedorAutenticacion>
      <BrowserRouter>
        <Routes>
          {/* Ruta raíz: página de presentación pública */}
          <Route path="/" element={<Presentacion />} />

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

          {/* Cuadrillas: coordinador ve todo, jefe ve la suya */}
          <Route
            path="/cuadrillas"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla']}>
                <GestionCuadrillas />
              </RutaProtegida>
            }
          />

          {/* Mapa interactivo con obras, familias y zonas de peligro */}
          <Route
            path="/mapa"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla', 'voluntario']}>
                <MapaInteractivo />
              </RutaProtegida>
            }
          />

          <Route path="/emergencias" element={<GestionEmergencias />}/>

          <Route
            path="/herramientas"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla']}>
                <GestionHerramientas />
              </RutaProtegida>
            }
          />

          <Route
            path="/inventario"
            element={
              <RutaProtegida rolesPermitidos={['coordinador']}>
                <GestionInventario />
              </RutaProtegida>
            }
          />

          <Route
            path="/catalogo"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla']}>
                <CatalogoInventario />
              </RutaProtegida>
            }
          />

          <Route
            path="/solicitudes"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla']}>
                <SolicitudesHerramientas />
              </RutaProtegida>
            }
          />

          <Route
            path="/usuarios"
            element={
              <RutaProtegida rolesPermitidos={['coordinador']}>
                <GestionUsuarios />
              </RutaProtegida>
            }
          />

          <Route
            path="/reportes"
            element={
              <RutaProtegida rolesPermitidos={['coordinador']}>
                <Reportes />
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
