interface ErrorAlertProps {
  message: string
  className?: string
}

export function ErrorAlert({ message, className = '' }: ErrorAlertProps) {
  return (
    <div className={`p-4 bg-[rgb(var(--color-danger-bg))] border border-[rgb(var(--color-danger))] rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-[rgb(var(--color-danger))] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-[rgb(var(--color-danger-fg))] mb-1">Error</h3>
          <p className="text-sm text-[rgb(var(--color-danger))]">{message}</p>
        </div>
      </div>
    </div>
  )
}