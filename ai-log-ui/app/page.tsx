'use client'
import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Textarea, Input, Button, LoadingSpinner, ErrorAlert, SeverityBadge, CopyButton } from '@/components'

import { ThemeToggle } from "@/components/ThemeToggle"

export default function Home() {
  const [log, setLog] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState("Processing your log...")
  const resultsRef = useRef<HTMLDivElement>(null)

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
    setResult(null)
    setError(null)

    // Scroll to results section after a short delay to allow the UI to update
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      const response = await fetch(`${API}/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw_log: log, context })
      })

      if (!response.ok) {
        // Handle HTTP error status codes
        let errorMessage = `Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage += ` - ${errorData.detail || 'An unknown error occurred on the server.'}`;
        } catch {
          errorMessage += ` - ${response.statusText}`;
        }
        setError(errorMessage);
        return;
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error("API Error:", err)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        // Network or fetch-related error
        setError('The server did not respond. Please check if it is running.');
      } else {
        setError(`An unexpected error occurred: ${err.message}`);
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--color-bg))]">
      <header className="sticky top-0 z-10 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-alt))]">
        <div className="w-full max-w-5xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-[rgb(var(--color-fg))]">
              AI Log Explainer
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <div className="w-full max-w-5xl mx-auto px-4 py-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="text-center mb-12">
          <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-br from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Understand Your Logs in Seconds
          </h2>
          <p className="text-xl text-[rgb(var(--color-fg-muted))] max-w-2xl mx-auto mt-4">
            Your intelligent debugging assistant. Paste any log file and get instant, clear explanations.
          </p>
        </header>

        {/* Main Content */}
        <main className="space-y-8 flex-1">
          {/* Input Section */}
          <Card>
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="log-input" className="block text-xs font-medium tracking-wide uppercase text-[rgb(var(--color-fg-muted))] pb-1 pt-3 pl-3">Log Data</label>
                <Textarea
                  id="log-input"
                  value={log}
                  onChange={e => setLog(e.target.value)}
                  placeholder={`Paste your raw log data here...\n\nFor example:\n2024-01-15 10:30:45 ERROR [DatabaseService] Connection timeout after 30s\n2024-01-15 10:30:45 ERROR [DatabaseService] Failed to execute query: SELECT * FROM users`}
                  rows={12}
                  resize="none"
                  className="p-4"
                />
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
            </div>
          </Card>

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={analyze}
              disabled={loading || !log}
              loading={loading}
              size="lg"
            >
              Analyze Log
            </Button>
          </div>

          {/* Results Section */}
          <div ref={resultsRef} className="space-y-8 pt-8">
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center">
                <LoadingSpinner message={loadingMessage} subtext="This may take 30-60 seconds for free models..." />
              </div>
            )}

            {/* Error State */}
            {error && (
              <ErrorAlert message={error} />
            )}

            {result && (
              <div className="space-y-8" aria-live="polite">
                {/* Main Explanation Card */}
                <Card>
                  <CardHeader>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[rgb(var(--color-primary-soft))]">
                      <svg className="w-5 h-5 text-[rgb(var(--color-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <CardTitle className="m-0">Log Explanation</CardTitle>
                      <CopyButton
                        getText={() => result.parsed ? result.parsed.summary || result.raw_llm : result.raw_llm}
                        label="Copy Explanation"
                        size="sm"
                        variant="outline"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.parsed ? (
                      <div className="space-y-5">
                        {result.parsed.summary && (
                          <section className="space-y-2">
                            <h3 className="text-xs font-semibold tracking-wide uppercase text-[rgb(var(--color-fg-muted))]">Summary</h3>
                            <p className="leading-relaxed text-[rgb(var(--color-fg))]">{result.parsed.summary}</p>
                          </section>
                        )}
                        {result.parsed.issue && (
                          <section className="space-y-2">
                            <h3 className="text-xs font-semibold tracking-wide uppercase text-red-400">Issue Identified</h3>
                            <p className="p-3 rounded-lg bg-[rgb(var(--color-danger-bg))] text-[rgb(var(--color-danger))] text-sm">{result.parsed.issue}</p>
                          </section>
                        )}
                        {result.parsed.solution && (
                          <section className="space-y-2">
                            <h3 className="text-xs font-semibold tracking-wide uppercase text-green-400">Recommended Solution</h3>
                            <p className="p-3 rounded-lg bg-[rgb(var(--color-success-bg))] text-[rgb(var(--color-success))] text-sm">{result.parsed.solution}</p>
                          </section>
                        )}
                        {result.parsed.severity && (
                          <section className="space-y-2">
                            <h3 className="text-xs font-semibold tracking-wide uppercase text-[rgb(var(--color-fg-muted))]">Severity Level</h3>
                            <SeverityBadge level={result.parsed.severity} />
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
                        getText={() => result.raw_llm}
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
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}