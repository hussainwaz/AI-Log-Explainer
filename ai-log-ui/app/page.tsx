
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Textarea, Input, Button, LoadingSpinner, ErrorAlert, SeverityBadge, CopyButton, Stepper, Skeleton, Meter } from '@/components'
import TaskList, { Task as TaskFromComponent } from '@/components/ui/TaskList'

import { ThemeToggle } from "@/components/ThemeToggle"

type Task = {
  id: string;
  title: string;
  description?: string;
  priority?: string;
};

type ParsedResult = {
  summary?: string;
  issue?: string;
  solution?: string;
  severity?: string;
  tasks?: Task[];
  root_cause?: string;
  probable_fixes?: string[];
  reproduction_steps?: string[];
  follow_up_tests?: string[];
  confidence_score?: number;
  notes?: string;
};
type ApiResult = {
  raw_llm?: string;
  parsed?: ParsedResult;
};

export default function Home() {
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [log, setLog] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | null>(null)
  const [errorSuggestions, setErrorSuggestions] = useState<string[] | null>(null)
  const [loadingMessage, setLoadingMessage] = useState("Processing your log...")
  const resultsRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLTextAreaElement>(null)
  const [lineCount, setLineCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const LARGE_CHAR_SOFT_LIMIT = 20000
  const [streaming, setStreaming] = useState(false)
  const [partial, setPartial] = useState('')
  const [progressStep, setProgressStep] = useState(0)
  const [redactSecrets, setRedactSecrets] = useState(false)
  const TRIM_LINES = 1000

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Progress messages for long-running requests
  useEffect(() => {
    if (!loading) return;

    const messages = [
      "Processing your log...",
      "Analyzing log patterns...",
      "Consulting AI model...",
      "Generating explanation...",
      "Almost ready..."
    ];

    let messageIndex = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 8000); // Change message every 8 seconds

    return () => clearInterval(interval);
  }, [loading]);

  async function analyze() {
    setLoading(true)
    setStreaming(false)
    setResult(null)
    setError(null)
    setErrorTitle(null)
    setErrorSuggestions(null)
    setPartial('')
    setProgressStep(0)

    const maskSecrets = (text: string) => {
      if (!text) return text
      let out = text
      // Mask common credential patterns key=value
      out = out.replace(/(api[-_ ]?key|secret|token|password|pwd)\s*[:=]\s*([^\s"']+)/gi, (_, k) => `${k}: ***`)
      // Mask Bearer tokens
      out = out.replace(/Bearer\s+[A-Za-z0-9\._\-]+/gi, 'Bearer ***')
      // Mask JWTs
      out = out.replace(/([A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,})/g, '***')
      // Mask long hex tokens
      out = out.replace(/\b[0-9a-f]{32,}\b/gi, '***')
      // Mask emails
      out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '***@***')
      return out
    }

    const payloadLog = redactSecrets ? maskSecrets(log) : log
    const payloadContext = redactSecrets ? maskSecrets(context) : context

    // Scroll to results section after a short delay to allow the UI to update
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // helper to map errors to friendly UI
    const categorizeError = (status?: number, detail?: unknown, source?: 'stream' | 'fallback' | 'network') => {
      const text = typeof detail === 'string'
        ? detail
        : (typeof detail === 'object' && detail && 'message' in (detail as any))
          ? String((detail as any).message)
          : (typeof detail === 'object' && detail && 'detail' in (detail as any))
            ? String((detail as any).detail)
            : undefined
      const msgLower = (text || '').toLowerCase()
      if (status === 401 || status === 403 || msgLower.includes('unauthorized') || msgLower.includes('forbidden')) {
        return {
          title: 'Authentication error',
          message: 'The API refused the request. Check your API key and permissions.',
          suggestions: [
            'Ensure OPENROUTER_API_KEY is set in the backend environment',
            'Restart the backend after setting environment variables',
            'Verify your account has access to the selected model',
          ],
        }
      }
      if (status === 402 || msgLower.includes('payment') || msgLower.includes('billing') || msgLower.includes('quota') || msgLower.includes('insufficient')) {
        return {
          title: 'Billing required or quota exceeded',
          message: 'Your plan may not allow this request or free quota is exhausted.',
          suggestions: [
            'Switch to a free model (e.g., deepseek/deepseek-r1:free) in the backend config',
            'Add a billing method to your OpenRouter account',
            'Try again later or reduce usage',
          ],
        }
      }
      if (status === 429 || msgLower.includes('rate limit')) {
        return {
          title: 'Rate limited',
          message: 'Too many requests in a short time.',
          suggestions: [
            'Wait a minute and retry',
            'Reduce request frequency',
            'Use a lighter model or batch requests',
          ],
        }
      }
      if (!status && source === 'network') {
        return {
          title: 'Cannot reach backend',
          message: 'The server did not respond. Please check if it is running.',
          suggestions: [
            'Start the backend (backend/run_backend.ps1)',
            'Verify NEXT_PUBLIC_API_URL points to the backend',
            'Check CORS settings on the backend',
          ],
        }
      }
      if ((status && status >= 500) || msgLower.includes('server error') || msgLower.includes('bad gateway')) {
        return {
          title: 'Server error',
          message: 'Something went wrong on the server.',
          suggestions: [
            'Check backend logs for a stack trace',
            'Retry the request',
            'Ensure the upstream AI API is reachable',
          ],
        }
      }
      return {
        title: 'Unexpected error',
        message: text || 'An unexpected error occurred.',
        suggestions: [
          'Retry the request',
          'If this persists, inspect backend logs',
        ],
      }
    }

    try {
      // Prefer streaming endpoint; fallback to non-streaming on error
      const controller = new AbortController()
      setStreaming(true)
      const response = await fetch(`${API}/explain/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_log: payloadLog, context: payloadContext }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        // fallback to non-streaming
        const fallback = await fetch(`${API}/explain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_log: payloadLog, context: payloadContext })
        })
        if (!fallback.ok) {
          let errorMessage = `Request failed (${fallback.status})`;
          let errorData: any = null
          try {
            errorData = await fallback.json();
            errorMessage = errorData?.detail || errorMessage
          } catch {
            // no-op
          }
          const mapped = categorizeError(fallback.status, errorData)
          setError(mapped.message || errorMessage)
          setErrorTitle(mapped.title)
          setErrorSuggestions(mapped.suggestions)
          return
        }
        const data = await fallback.json()
        setResult(data)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE: split by double newlines into events
        const events = buffer.split('\n\n')
        // keep last partial in buffer
        buffer = events.pop() || ''
        for (const evt of events) {
          const lines = evt.split('\n')
          let eventType = 'message'
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            if (line.startsWith('data: ')) dataLine += line.slice(6)
          }
          if (!dataLine) continue
          try {
            const payload = JSON.parse(dataLine)
            if (eventType === 'status') {
              setProgressStep(payload.step || 0)
              setLoadingMessage(payload.message || loadingMessage)
            } else if (eventType === 'chunk') {
              setPartial(prev => prev + (payload.content || ''))
            } else if (eventType === 'final') {
              setResult(payload)
              setStreaming(false)
            } else if (eventType === 'error') {
              const mapped = categorizeError(undefined, payload, 'stream')
              setError(mapped.message || payload.message || 'Streaming error')
              setErrorTitle(mapped.title)
              setErrorSuggestions(mapped.suggestions)
              setStreaming(false)
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err: unknown) {
      console.error("API Error:", err)
      if (err instanceof TypeError && typeof err.message === 'string' && err.message.includes('fetch')) {
        const mapped = categorizeError(undefined, (err as any)?.message, 'network')
        setError(mapped.message)
        setErrorTitle(mapped.title)
        setErrorSuggestions(mapped.suggestions)
      } else if (err instanceof Error) {
        const mapped = categorizeError(undefined, err.message)
        setError(mapped.message)
        setErrorTitle(mapped.title)
        setErrorSuggestions(mapped.suggestions)
      } else {
        const mapped = categorizeError()
        setError(mapped.message)
        setErrorTitle(mapped.title)
        setErrorSuggestions(mapped.suggestions)
      }
    } finally {
      setLoading(false)
    }
  }

  // Export helpers
  const exportJSON = () => {
    const payload = result?.parsed ?? result
    if (!payload) return
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'log-explain.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportMarkdown = () => {
    const p = result?.parsed
    const lines: string[] = []
    lines.push('# Log Analysis Report')
    if (!p) {
      lines.push('\nRaw Response')
      lines.push('')
      lines.push('```')
      lines.push(result?.raw_llm ?? 'N/A')
      lines.push('```')
    } else {
      if (p.summary) { lines.push(`\n## Summary\n${p.summary}`) }
      if (p.severity) { lines.push(`\n**Severity:** ${p.severity}`) }
      if (typeof p.confidence_score === 'number') { lines.push(`\n**Confidence:** ${p.confidence_score}%`) }
      if (p.root_cause) { lines.push(`\n## Root Cause\n${p.root_cause}`) }
      if (p.probable_fixes?.length) {
        lines.push('\n## Probable Fixes')
        p.probable_fixes.forEach((f) => lines.push(`- ${f}`))
      }
      if (p.reproduction_steps?.length) {
        lines.push('\n## Reproduction Steps')
        p.reproduction_steps.forEach((s) => lines.push(`1. ${s}`))
      }
      if (p.follow_up_tests?.length) {
        lines.push('\n## Follow-up Tests')
        p.follow_up_tests.forEach((t) => lines.push(`- ${t}`))
      }
      if (p.notes) { lines.push(`\n## Notes\n${p.notes}`) }
      if (p.tasks?.length) {
        lines.push('\n## Tasks')
        p.tasks.forEach((t) => lines.push(`- [ ] ${t.title}${t.priority ? ` (priority: ${t.priority})` : ''}${t.description ? ` — ${t.description}` : ''}`))
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'log-explain.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Counts update
  useEffect(() => {
    const lines = log.split(/\r?\n/).length
    setLineCount(lines)
    setCharCount(log.length)
  }, [log])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMetaEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter'
      if (isMetaEnter) {
        e.preventDefault()
        if (!loading && log.trim()) analyze()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loading, log])

  // Drag & drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const text = await file.text()
    setLog(text)
  }, [])

  const clearAll = () => {
    setLog('')
    setContext('')
    setResult(null)
    setError(null)
    setViewMode('pretty')
    logRef.current?.focus()
  }

  // Sample logs
  const samples = [
    {
      label: 'DB Timeout (Postgres)',
      value: `2025-09-20 10:30:45 ERROR [DatabaseService] connection to server at "db.example.com" (10.0.1.12), port 5432 failed: timeout\n\nDETAIL: could not send data to server: Connection timed out\nSTATEMENT: SELECT * FROM users WHERE id = 42;`
    },
    {
      label: 'API 500 (Node)',
      value: `2025-09-20T12:01:22.339Z ERROR request-id=abc123 path=/checkout error=TypeError: Cannot read properties of undefined (reading 'total')\n    at CartService.calculateTotal (/srv/app/services/cart.js:42:13)`
    },
    {
      label: 'Nginx 502',
      value: `2025/09/20 15:44:01 [error] 1234#1234: *789 upstream prematurely closed connection while reading response header from upstream, client: 192.168.1.10, server: _, request: "GET /api/health HTTP/1.1", upstream: "http://127.0.0.1:5000/api/health"`
    }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--color-bg))]">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-[rgb(var(--color-bg))]/70 border-b border-[rgb(var(--color-border))]">
        <div className="w-full max-w-5xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-[1px] bg-gradient-to-br from-blue-500/60 to-purple-500/60">
              <div className="w-9 h-9 rounded-[10px] bg-[rgb(var(--color-bg))] flex items-center justify-center">
                <svg className="w-5 h-5 text-[rgb(var(--color-fg))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 9c4-6 12-6 16 0" strokeLinecap="round" />
                  <path d="M6 13c2.5-3.5 9.5-3.5 12 0" strokeLinecap="round" />
                  <circle cx="12" cy="17" r="1.25" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tracking-tight text-[rgb(var(--color-fg))]">AI Log Explainer</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[rgb(var(--color-border))] text-[rgb(var(--color-fg-muted))]">Beta</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="w-full max-w-5xl mx-auto px-4 py-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-alt))] text-[11px] text-[rgb(var(--color-fg-muted))] px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-success))]"></span>
            AI‑powered log analysis
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight leading-tight">
            <span className="bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent">Explain complex logs</span>
            <span className="text-[rgb(var(--color-fg))]"> in seconds</span>
          </h2>
          <p className="text-[15px] md:text-lg text-[rgb(var(--color-fg-muted))] max-w-2xl mx-auto mt-4 leading-relaxed">
            Paste raw logs and get a concise, actionable explanation with root cause, severity, and next steps—no noise, just clarity.
          </p>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            {/* Input Section */}
            <Card>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="log-input" className="block text-xs font-medium tracking-wide uppercase text-[rgb(var(--color-fg-muted))] pb-1 pt-3 pl-3">Log Data</label>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`rounded-lg border ${isDragging ? 'border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary-soft))]' : 'border-[rgb(var(--color-border))]'} transition-colors`}
                  >
                    <Textarea
                      id="log-input"
                      ref={logRef}
                      value={log}
                      onChange={e => setLog(e.target.value)}
                      placeholder={`Paste your raw log data here... or drop a .log/.txt file`}
                      rows={14}
                      resize="none"
                      className="p-4 font-mono"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between px-4 py-2 text-xs text-[rgb(var(--color-fg-muted))] border-t border-[rgb(var(--color-border))]">
                      <div className="flex items-center gap-3">
                        <span>{lineCount} lines</span>
                        <span>•</span>
                        <span>{charCount.toLocaleString()} chars</span>
                        {charCount > LARGE_CHAR_SOFT_LIMIT && (
                          <span className="text-[rgb(var(--color-warn))] font-medium">Large input may slow analysis</span>
                        )}
                      </div>
                      <div className="text-[rgb(var(--color-fg-muted))]">Drag & drop a file</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="context-input" className="block text-xs font-medium tracking-wide uppercase text-[rgb(var(--color-fg-muted))] pb-1 pl-3">Context (Optional)</label>
                  <Input
                    id="context-input"
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    placeholder="e.g., Production environment, Node.js application, MySQL database"
                    className="pl-4"
                  />
                </div>

                {/* Samples */}
                <div className="flex flex-wrap gap-2 px-3">
                  {samples.map(s => (
                    <Button key={s.label} size="sm" variant="outline" onClick={() => setLog(s.value)}>
                      Load: {s.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="subtle" onClick={clearAll}>Clear</Button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 px-3 pb-4">
                  <div className="flex items-center gap-4 text-xs text-[rgb(var(--color-fg-muted))]">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="accent-[rgb(var(--color-primary))]"
                        checked={redactSecrets}
                        onChange={(e) => setRedactSecrets(e.target.checked)}
                      />
                      <span>Redact secrets before sending</span>
                    </label>
                    {lineCount > TRIM_LINES && (
                      <button
                        type="button"
                        className="px-2 py-1 rounded border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-accent))]"
                        onClick={() => {
                          const trimmed = log.split(/\r?\n/).slice(0, TRIM_LINES).join('\n')
                          setLog(trimmed)
                        }}
                        title={`Trim to first ${TRIM_LINES} lines`}
                      >
                        Trim to {TRIM_LINES} lines
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={() => setViewMode(viewMode === 'pretty' ? 'raw' : 'pretty')}
                    variant="outline"
                  >
                    {viewMode === 'pretty' ? 'Raw JSON' : 'Pretty View'}
                  </Button>
                  <Button
                    onClick={analyze}
                    disabled={loading || !log}
                    loading={loading}
                  >
                    Analyze Log
                  </Button>
                </div>
              </div>
            </Card>

            {/* Results Section */}
            <div ref={resultsRef} className="space-y-8 pt-0">
              {/* View Toggle */}
              {result && (
                <div className="flex justify-center">
                  <div className="inline-flex rounded-md border border-[rgb(var(--color-border))] overflow-hidden">
                    <button
                      className={`px-3 py-1.5 text-sm ${viewMode === 'pretty' ? 'bg-[rgb(var(--color-bg-accent))] text-[rgb(var(--color-fg))]' : 'text-[rgb(var(--color-fg-muted))]'}`}
                      onClick={() => setViewMode('pretty')}
                    >
                      Pretty
                    </button>
                    <button
                      className={`px-3 py-1.5 text-sm border-l border-[rgb(var(--color-border))] ${viewMode === 'raw' ? 'bg-[rgb(var(--color-bg-accent))] text-[rgb(var(--color-fg))]' : 'text-[rgb(var(--color-fg-muted))]'}`}
                      onClick={() => setViewMode('raw')}
                    >
                      JSON
                    </button>
                  </div>
                </div>
              )}
              {/* Loading State */}
              {(loading || streaming) && (
                <div className="flex flex-col items-center gap-4">
                  <LoadingSpinner message={loadingMessage} subtext="This may take 30-60 seconds for free models..." />
                  <Stepper steps={["Start", "Generate", "Parse"]} current={Math.max(1, progressStep || 1)} />
                  <div className="w-full max-w-5xl">
                    <Card>
                      <CardHeader>
                        <CardTitle>Live Output</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {partial ? (
                          <pre className="text-xs bg-[rgb(var(--color-bg))] p-3 rounded border border-[rgb(var(--color-border))] overflow-auto leading-relaxed whitespace-pre-wrap">{partial}</pre>
                        ) : (
                          <div className="space-y-2">
                            <Skeleton className="h-4" />
                            <Skeleton className="h-4 w-11/12" />
                            <Skeleton className="h-4 w-10/12" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <ErrorAlert
                  message={error}
                  title={errorTitle || undefined}
                  suggestions={errorSuggestions || undefined}
                  onRetry={() => analyze()}
                  retryLabel={loading ? 'Retrying...' : 'Try again'}
                />
              )}

              {result && (
                <div className="space-y-8" aria-live="polite">
                  {viewMode === 'raw' ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Raw JSON Output</CardTitle>
                        <CopyButton
                          getText={() => JSON.stringify(result.parsed, null, 2)}
                          label="Copy JSON"
                          size="sm"
                          variant="outline"
                        />
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))] p-4 rounded-lg overflow-auto border border-[rgb(var(--color-border))]">
                          {JSON.stringify(result.parsed, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Redesigned Results Card */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between w-full">
                            <CardTitle className="m-0">Log Analysis</CardTitle>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={exportJSON}>Export JSON</Button>
                              <Button size="sm" variant="outline" onClick={exportMarkdown}>Export MD</Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {result.parsed ? (
                            <div className="space-y-6">
                              {/* Jump Tabs */}
                              <div className="flex flex-wrap gap-2 mb-1">
                                {result.parsed.summary && <a href="#summary" className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-accent))]">Summary</a>}
                                {result.parsed.root_cause && <a href="#root-cause" className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-accent))]">Root Cause</a>}
                                {result.parsed.probable_fixes?.length ? <a href="#fixes" className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-accent))]">Fixes</a> : null}
                                {result.parsed.reproduction_steps?.length ? <a href="#steps" className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-accent))]">Steps</a> : null}
                                {result.parsed.follow_up_tests?.length ? <a href="#tests" className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-accent))]">Tests</a> : null}
                                {result.parsed.notes ? <a href="#notes" className="text-xs px-2 py-1 rounded border border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-bg-accent))]">Notes</a> : null}
                              </div>
                              {/* Summary */}
                              {result.parsed.summary && (
                                <section className="space-y-2" id="summary">
                                  <h3 className="text-base font-bold text-blue-400">Summary</h3>
                                  <div className="flex items-center gap-2">
                                    <p className="leading-relaxed text-lg text-[rgb(var(--color-fg))] font-medium flex-1">{result.parsed.summary}</p>
                                    <CopyButton getText={() => result.parsed?.summary ?? ''} label="" size="sm" variant="outline" />
                                  </div>
                                </section>
                              )}
                              {/* Root Cause */}
                              {result.parsed.root_cause && (
                                <section className="space-y-2" id="root-cause">
                                  <h3 className="text-xs font-semibold tracking-wide uppercase text-purple-400">Root Cause</h3>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm text-[rgb(var(--color-fg))] flex-1">{result.parsed.root_cause}</p>
                                    <CopyButton getText={() => result.parsed?.root_cause ?? ''} label="" size="sm" variant="outline" />
                                  </div>
                                </section>
                              )}
                              {/* Probable Fixes */}
                              {result.parsed.probable_fixes && result.parsed.probable_fixes.length > 0 && (
                                <section className="space-y-2" id="fixes">
                                  <h3 className="text-xs font-semibold tracking-wide uppercase text-green-400">Probable Fixes</h3>
                                  <ul className="space-y-1">
                                    {result.parsed.probable_fixes.map((fix: string, idx: number) => (
                                      <li key={idx} className="flex items-center gap-2">
                                        <span className="text-sm text-[rgb(var(--color-fg))]">{fix}</span>
                                        <CopyButton getText={() => fix} label="" size="sm" variant="subtle" />
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              )}
                              {/* Severity */}
                              {result.parsed.severity && (
                                <section className="space-y-2">
                                  <h3 className="text-xs font-semibold tracking-wide uppercase text-yellow-400">Severity</h3>
                                  <SeverityBadge level={result.parsed.severity} />
                                </section>
                              )}
                              {/* Reproduction Steps */}
                              {result.parsed.reproduction_steps && result.parsed.reproduction_steps.length > 0 && (
                                <section className="space-y-2" id="steps">
                                  <h3 className="text-xs font-semibold tracking-wide uppercase text-cyan-400">Reproduction Steps</h3>
                                  <ul className="space-y-1">
                                    {result.parsed.reproduction_steps.map((step: string, idx: number) => (
                                      <li key={idx} className="flex items-center gap-2">
                                        <span className="text-sm text-[rgb(var(--color-fg))]">{step}</span>
                                        <CopyButton getText={() => step} label="" size="sm" variant="subtle" />
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              )}
                              {/* Follow-up Tests */}
                              {result.parsed.follow_up_tests && result.parsed.follow_up_tests.length > 0 && (
                                <section className="space-y-2" id="tests">
                                  <h3 className="text-xs font-semibold tracking-wide uppercase text-pink-400">Follow-up Tests</h3>
                                  <ul className="space-y-1">
                                    {result.parsed.follow_up_tests.map((test: string, idx: number) => (
                                      <li key={idx} className="flex items-center gap-2">
                                        <span className="text-sm text-[rgb(var(--color-fg))]">{test}</span>
                                        <CopyButton getText={() => test} label="" size="sm" variant="subtle" />
                                      </li>
                                    ))}
                                  </ul>
                                </section>
                              )}
                              {/* Confidence Score */}
                              {typeof result.parsed.confidence_score === 'number' && (
                                <section className="space-y-2">
                                  <h3 className="text-xs font-semibold tracking-wide uppercase text-indigo-400">Confidence</h3>
                                  <div className="flex items-center gap-4">
                                    <Meter
                                      value={result.parsed.confidence_score}
                                      severity={result.parsed.severity || 'info'}
                                      label="Model confidence"
                                    />
                                    <div className="text-xs text-[rgb(var(--color-fg-muted))] leading-snug">
                                      This reflects how certain the model is about the explanation based on the input.
                                    </div>
                                  </div>
                                </section>
                              )}
                              {/* Notes (expand/collapse) */}
                              {result.parsed.notes && (
                                <section className="space-y-2" id="notes">
                                  <h3 className="text-xs font-semibold tracking-wide uppercase text-gray-400">Notes</h3>
                                  <details className="group">
                                    <summary className="cursor-pointer text-sm text-gray-300 flex items-center gap-2">
                                      <span>Show/Hide Notes</span>
                                      <CopyButton getText={() => result.parsed?.notes ?? ''} label="" size="sm" variant="subtle" />
                                    </summary>
                                    <div className="mt-2 text-[rgb(var(--color-fg-muted))] text-sm whitespace-pre-line">{result.parsed.notes}</div>
                                  </details>
                                </section>
                              )}
                            </div>
                          ) : (
                            <div className="prose max-w-none">
                              <div className="whitespace-pre-wrap leading-relaxed text-[rgb(var(--color-fg))]">
                                {result.raw_llm || 'No explanation available.'}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Task List Integration */}
                      <TaskList tasks={result.parsed?.tasks as TaskFromComponent[] ?? []} />

                      {/* Technical Details (Collapsible) */}
                      <details className="group border border-[rgb(var(--color-border))] rounded-lg bg-[rgb(var(--color-bg-alt))]">
                        <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-[rgb(var(--color-fg-muted))] hover:bg-[rgb(var(--color-bg-accent))] hover:text-[rgb(var(--color-fg))] transition-colors rounded-t-lg">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 transition-transform duration-200 ease-in-out transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                            <span>View Technical Details</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CopyButton
                              getText={() => result.raw_llm ?? ''}
                              label="Copy Raw"
                              size="sm"
                              variant="subtle"
                            />
                            {result.parsed && (
                              <CopyButton
                                getText={() => JSON.stringify(result.parsed, null, 2)}
                                label="Copy JSON"
                                size="sm"
                                variant="subtle"
                              />
                            )}
                          </div>
                        </summary>
                        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-[rgb(var(--color-border))]">
                          <div>
                            <h4 className="text-sm font-medium text-[rgb(var(--color-fg-muted))] mb-2">Raw AI Response</h4>
                            <pre className="text-xs bg-[rgb(var(--color-bg))] p-3 rounded border border-[rgb(var(--color-border))] overflow-auto leading-relaxed">{result.raw_llm || 'N/A'}</pre>
                          </div>
                          {result.parsed && (
                            <div>
                              <h4 className="text-sm font-medium text-[rgb(var(--color-fg-muted))] mb-2">Structured Data</h4>
                              <pre className="text-xs bg-[rgb(var(--color-bg))] p-3 rounded border border-[rgb(var(--color-border))] overflow-auto leading-relaxed">{JSON.stringify(result.parsed, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </details>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}