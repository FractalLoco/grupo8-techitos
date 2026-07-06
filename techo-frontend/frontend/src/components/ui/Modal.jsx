import { MdClose } from 'react-icons/md';

export default function Modal({ open, onClose, title, subtitle, icon, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h2 className="font-bold text-on-surface text-sm leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-outline mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface-variant transition ml-2 flex-shrink-0">
            <MdClose className="text-xl" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
