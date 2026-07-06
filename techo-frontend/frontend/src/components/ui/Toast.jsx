import { MdCheckCircle, MdError } from 'react-icons/md';

export default function Toast({ type = 'success', message, onClose }) {
  if (!message) return null;
  return (
    <div className={`toast-${type}`}>
      {type === 'success' ? <MdCheckCircle className="text-lg" /> : <MdError className="text-lg" />}
      {message}
    </div>
  );
}
