import { useNavigate, Link } from 'react-router-dom';

function NotFound() {
  const navegar = useNavigate();

  return (
    <div className="min-h-screen flex bg-techo-light items-center justify-center px-6">
      <div className="text-center">
        <p className="text-7xl font-black text-techo-primary/20 mb-2">404</p>
        <h1 className="text-2xl font-bold text-techo-primary mb-3">
          Próximamente
        </h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          Estamos trabajando para mejorarlo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            className="px-5 py-2.5 bg-techo-primary hover:bg-techo-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
            onClick={() => navegar(-1)}
          >
            Volver atrás
          </button>
          <Link
            to="/inicio"
            className="px-5 py-2.5 bg-white hover:bg-gray-50 text-techo-primary border border-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
