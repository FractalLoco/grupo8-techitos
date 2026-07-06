export default function Input({ label, help, error, className = '', ...props }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input className={`input-field ${error ? 'border-error ring-error/20' : ''} ${className}`} {...props} />
      {help && <p className="text-xs text-outline mt-1">{help}</p>}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}
