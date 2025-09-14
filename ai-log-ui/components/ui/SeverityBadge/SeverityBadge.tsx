import { Badge } from '../Badge'

interface SeverityBadgeProps {
  level: string
  className?: string
}

export function SeverityBadge({ level, className = '' }: SeverityBadgeProps) {
  const normalizedLevel = level.toLowerCase()
  
  const getVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
      case 'error':
        return 'danger' as const
      case 'medium':
      case 'warning':
      case 'warn':
        return 'warning' as const
      case 'low':
      case 'info':
      case 'informational':
        return 'success' as const
      default:
        return 'default' as const
    }
  }

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
      case 'error':
        return '🔴'
      case 'medium':
      case 'warning':
      case 'warn':
        return '🟡'
      case 'low':
      case 'info':
      case 'informational':
        return '🟢'
      default:
        return '⚪'
    }
  }

  return (
    <Badge variant={getVariant(normalizedLevel)} className={className}>
      <span className="mr-1">{getIcon(normalizedLevel)}</span>
      {level}
    </Badge>
  )
}