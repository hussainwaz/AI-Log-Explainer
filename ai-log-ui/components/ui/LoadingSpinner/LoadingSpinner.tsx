interface LoadingSpinnerProps {
  message?: string
  subtext?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  subtext,
  size = 'md'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex items-center gap-3">
        <svg
          className={`animate-spin ${sizeClasses[size]} text-[rgb(var(--color-primary))]`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-[rgb(var(--color-fg))] font-medium">{message}</span>
      </div>
      {subtext && (
        <p className="text-sm text-[rgb(var(--color-fg-muted))] text-center max-w-md">
          {subtext}
        </p>
      )}
    </div>
  )
}