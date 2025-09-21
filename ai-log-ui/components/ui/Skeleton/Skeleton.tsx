import React from 'react'

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div className={`animate-pulse bg-[rgb(var(--color-bg-accent))] rounded ${className}`} />)
}
