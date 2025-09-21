import React, { forwardRef } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  resize?: 'none' | 'y' | 'x' | 'both'
  className?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    id,
    value,
    onChange,
    placeholder = '',
    rows = 4,
    resize = 'none',
    className = '',
    ...rest
  },
  ref
) {
  const resizeClasses = {
    none: 'resize-none',
    y: 'resize-y',
    x: 'resize-x',
    both: 'resize'
  }

  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      ref={ref}
      className={`w-full px-3 py-2 bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))] rounded-lg text-[rgb(var(--color-fg))] placeholder-[rgb(var(--color-fg-muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition-colors ${resizeClasses[resize]} ${className}`}
      {...rest}
    />
  )
})