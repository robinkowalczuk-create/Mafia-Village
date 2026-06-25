import { sounds } from '../../lib/sounds'

export function Button({ children, variant = 'primary', onClick, disabled, className = '', icon, ...props }) {
  const variants = {
    primary: 'btn-primary',
    ghost:   'btn-ghost',
    danger:  'btn-danger',
  }

  const handleClick = (e) => {
    if (!disabled) {
      sounds.uiClick()
      onClick?.(e)
    }
  }

  return (
    <button
      className={`${variants[variant]} ${icon ? 'btn-icon' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {children}
    </button>
  )
}
