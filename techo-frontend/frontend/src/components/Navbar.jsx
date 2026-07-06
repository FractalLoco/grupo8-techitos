import { useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <div className="fixed left-4 top-4 z-[3000]">
      <button
        type="button"
        onClick={() => navigate('/inicio')}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-techo-primaryDark bg-techo-primary px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-techo-primaryDark hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-techo-secondary focus:ring-offset-2"
        aria-label="Volver al inicio"
      >
        <MdArrowBack size={20} />
        Volver al inicio
      </button>
    </div>
  );
}
