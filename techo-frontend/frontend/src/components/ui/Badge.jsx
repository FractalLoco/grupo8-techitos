const colors = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  blue: 'badge-blue',
  gray: 'badge-gray',
  primary: 'badge bg-primary/10 text-primary',
  error: 'badge bg-error/10 text-error',
  success: 'badge bg-green-50 text-[#006D37]',
  warning: 'badge bg-amber-50 text-[#835100]',
};

export default function Badge({ color = 'gray', children, className = '' }) {
  return <span className={`${colors[color] || colors.gray} ${className}`}>{children}</span>;
}
