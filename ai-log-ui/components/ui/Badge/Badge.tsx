interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'danger' | 'warning' | 'success'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '' 
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  }
  
  const variantClasses = {
    default: 'bg-[rgb(var(--color-bg-accent))] text-[rgb(var(--color-fg))]',
    danger: 'bg-[rgb(var(--color-danger-bg))] text-[rgb(var(--color-danger))]',
    warning: 'bg-[rgb(var(--color-warn-bg))] text-[rgb(var(--color-warn))]',
    success: 'bg-[rgb(var(--color-success-bg))] text-[rgb(var(--color-success))]'
  }

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}