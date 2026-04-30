import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProveedorAutenticacion } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import SinPermiso from './pages/SinPermiso';
import NotFound from './pages/NotFound';

// páginas protegidas que se agregan a medida que avance el proyecto
// import PanelCoordinador from './pages/PanelCoordinador';
// import PanelJefe from './pages/PanelJefe';

function Aplicacion() {
  return (
    // el proveedor envuelve toda la app para que cualquier componente acceda a la sesión
    <ProveedorAutenticacion>
      <BrowserRouter>
        <Routes>

          {/* si alguien entra a la raíz lo mandamos directo al login */}
          <Route path="/" element={<Navigate to="/auth/iniciar-sesion" replace />} />

          {/* ruta pública del login */}
          <Route path="/auth/iniciar-sesion" element={<Login />} />

          {/* página de inicio después del login — accesible para todos los roles */}
          <Route
            path="/inicio"
            element={
              <RutaProtegida rolesPermitidos={['coordinador', 'jefe_cuadrilla', 'voluntario']}>
                <Inicio />
              </RutaProtegida>
            }
          />

          {/* rutas protegidas solo para coordinador — se descomentan cuando estén listas */}
          {/* <Route
            path="/panel"
            element={
              <RutaProtegida rolesPermitidos={['coordinador']}>
                <PanelCoordinador />
              </RutaProtegida>
            }
          /> */}

          {/* página de acceso denegado cuando el rol no alcanza */}
          <Route path="/sin-permiso" element={<SinPermiso />} />

          {/* cualquier ruta que no exista cae acá */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </ProveedorAutenticacion>
  );
}

export default Aplicacion;
