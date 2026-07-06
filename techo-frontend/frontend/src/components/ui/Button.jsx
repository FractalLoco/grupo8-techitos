const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  error: 'btn-error',
  success: 'btn-success',
  ghost: 'inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-xl hover:bg-surface-container-low transition-all min-h-[44px] text-on-surface-variant hover:text-on-surface',
  filter: 'filter-btn-inactive',
  'filter-active': 'filter-btn-active',
};

export default function Button({ variant = 'primary', children, className = '', ...props }) {
  return (
    <button className={`${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
