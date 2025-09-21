interface ErrorAlertProps {
  message: string
  className?: string
  title?: string
  suggestions?: string[]
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorAlert({ message, className = '', title = 'Error', suggestions, onRetry, retryLabel = 'Retry' }: ErrorAlertProps) {
  return (
    <div className={`p-4 bg-[rgb(var(--color-danger-bg))] border border-[rgb(var(--color-danger))] rounded-lg ${className}`} role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-[rgb(var(--color-danger))] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-[rgb(var(--color-danger-fg))] mb-1">{title}</h3>
          <p className="text-sm text-[rgb(var(--color-danger))]">{message}</p>
          {suggestions && suggestions.length > 0 && (
            <ul className="mt-2 list-disc pl-5 space-y-1 text-[13px] text-[rgb(var(--color-danger-fg))]">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {onRetry && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1.5 rounded border border-[rgb(var(--color-danger))] text-[rgb(var(--color-danger-fg))] hover:bg-[rgb(var(--color-danger))/10] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4v6h6" strokeLinecap="round" />
                  <path d="M20 20v-6h-6" strokeLinecap="round" />
                  <path d="M20 10a8 8 0 0 0-14.5-4.9M4 14a8 8 0 0 0 14.5 4.9" />
                </svg>
                {retryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}