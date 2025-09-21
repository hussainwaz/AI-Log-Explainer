import React from 'react'

type Step = {
    label: string
}

interface StepperProps {
    steps: Step[] | string[]
    current: number // 1-based index of current step
    className?: string
}

export function Stepper({ steps, current, className = '' }: StepperProps) {
    const normalized: Step[] = (steps as any[]).map(s => typeof s === 'string' ? ({ label: s }) : s)
    const lastIdx = normalized.length - 1
    const safeCurrent = Math.min(Math.max(current, 1), normalized.length)

    return (
        <div className={`w-full max-w-3xl mx-auto ${className}`}>
            <ol className="flex items-center w-full">
                {normalized.map((step, idx) => {
                    const isCompleted = idx + 1 < safeCurrent
                    const isCurrent = idx + 1 === safeCurrent
                    return (
                        <li key={idx} className="flex-1 flex items-center">
                            <div className="flex flex-col items-center text-center min-w-0">
                                <div
                                    className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs font-semibold transition-colors
                    ${isCompleted ? 'bg-[rgb(var(--color-primary))] text-white border-[rgb(var(--color-primary))]' : ''}
                    ${isCurrent && !isCompleted ? 'border-[rgb(var(--color-primary))] text-[rgb(var(--color-primary))] bg-[rgb(var(--color-bg-alt))]' : ''}
                    ${!isCompleted && !isCurrent ? 'border-[rgb(var(--color-border))] text-[rgb(var(--color-fg-muted))]' : ''}
                  `}
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    {isCompleted ? (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                <div className="mt-2 text-[10px] sm:text-xs truncate max-w-[8rem] text-[rgb(var(--color-fg-muted))]">
                                    {step.label}
                                </div>
                            </div>
                            {idx !== lastIdx && (
                                <div className={`flex-1 h-0.5 mx-2 sm:mx-3 ${idx + 1 < safeCurrent ? 'bg-[rgb(var(--color-primary))]' : 'bg-[rgb(var(--color-border))]'}`} />
                            )}
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
