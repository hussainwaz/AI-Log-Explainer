'use client'
import { useState } from 'react'
import { Button } from '../Button'

interface CopyButtonProps {
  getText: () => string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline' | 'subtle'
  className?: string
}

export function CopyButton({ 
  getText, 
  label = 'Copy',
  size = 'sm',
  variant = 'outline',
  className = ''
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <Button 
      onClick={handleCopy}
      size={size}
      variant={variant}
      className={className}
    >
      {copied ? (
        <>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </Button>
  )
}