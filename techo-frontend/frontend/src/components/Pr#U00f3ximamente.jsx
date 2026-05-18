import Navbar from '../components/Navbar';

function Próximamente({ titulo = 'Página en construcción' }) {
  return (
    <div className="min-h-screen bg-techo-light">
      <Navbar />
      <div className="pt-16 min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-7xl font-black text-techo-primary/20 mb-2">404</p>
          <h1 className="text-2xl font-bold text-techo-primary mb-3">{titulo}</h1>
          <p className="text-gray-400 text-sm">Estamos trabajando para mejorarlo.</p>
        </div>
      </div>
    </div>
  );
}

export default Próximamente;
