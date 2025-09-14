interface InputProps {
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  type?: string
}

export function Input({ 
  id,
  value, 
  onChange, 
  placeholder = '', 
  className = '',
  type = 'text'
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] rounded-lg text-[rgb(var(--color-fg))] placeholder-[rgb(var(--color-fg-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition-colors ${className}`}
    />
  )
}