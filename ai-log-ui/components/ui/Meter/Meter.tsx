import React from 'react'

interface MeterProps {
    value: number // 0-100
    size?: number // px
    strokeWidth?: number // px
    severity?: string // affects color
    label?: string
    className?: string
}

export function Meter({ value, size = 88, strokeWidth = 8, severity = 'info', label, className = '' }: MeterProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const pct = Math.max(0, Math.min(100, value))
    const dash = (pct / 100) * circumference

    const color = (() => {
        const s = severity.toLowerCase()
        if (['critical', 'high', 'error'].includes(s)) return 'rgb(var(--color-danger))'
        if (['medium', 'warning', 'warn'].includes(s)) return 'rgb(var(--color-warn))'
        if (['low', 'success', 'info', 'informational'].includes(s)) return 'rgb(var(--color-success))'
        return 'rgb(var(--color-primary))'
    })()

    return (
        <div className={`inline-flex flex-col items-center ${className}`} aria-label={label || 'meter'}>
            <svg width={size} height={size} role="img" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={`rgba(127,127,127,0.25)`}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={14} fill="currentColor">
                    {Math.round(pct)}%
                </text>
            </svg>
            {label && <div className="mt-1 text-xs text-[rgb(var(--color-fg-muted))]">{label}</div>}
        </div>
    )
}
