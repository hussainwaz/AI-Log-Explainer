"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Braces,
  Coins,
  Cpu,
  Check,
  ClipboardList,
  Copy,
  Crosshair,
  Download,
  Eraser,
  FileJson,
  FlaskConical,
  Gauge,
  ListOrdered,
  Loader2,
  ScrollText,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Terminal,
  Upload,
  Wrench,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ── contract with the backend ──────────────────────────────────────────── */

type Task = { id: string; title: string; description?: string; priority?: string };

type ParsedResult = {
  summary?: string;
  severity?: string;
  root_cause?: string;
  probable_fixes?: string[];
  reproduction_steps?: string[];
  follow_up_tests?: string[];
  confidence_score?: number;
  notes?: string;
  tasks?: Task[];
};

type Usage = {
  model: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  reasoning_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

type ApiResult = { raw_llm?: string; parsed?: ParsedResult; usage?: Usage };

type ModelChoice = { id: string; label: string; tier: "free" | "cheap" | "mid" | "strong" };

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SAMPLES = [
  {
    label: "Postgres timeout",
    value: `2025-09-20 10:30:45 ERROR [DatabaseService] connection to server at "db.example.com" (10.0.1.12), port 5432 failed: timeout

DETAIL: could not send data to server: Connection timed out
STATEMENT: SELECT * FROM users WHERE id = 42;`,
  },
  {
    label: "Node 500",
    value: `2025-09-20T12:01:22.339Z ERROR request-id=abc123 path=/checkout error=TypeError: Cannot read properties of undefined (reading 'total')
    at CartService.calculateTotal (/srv/app/services/cart.js:42:13)`,
  },
  {
    label: "Nginx 502",
    value: `2025/09/20 15:44:01 [error] 1234#1234: *789 upstream prematurely closed connection while reading response header from upstream, client: 192.168.1.10, server: _, request: "GET /api/health HTTP/1.1", upstream: "http://127.0.0.1:5000/api/health"`,
  },
];

const STEPS = ["Reading the log", "Finding the pattern", "Asking the model", "Writing it up"];

/** OpenRouter bills in fractions of a cent, so a plain toFixed(2) reads $0.00
 *  for every run. Show enough places that the number means something. */
function formatCost(cost?: number) {
  if (cost == null) return "n/a";
  if (cost === 0) return "free";
  if (cost < 0.01) return `$${cost.toFixed(5)}`;
  return `$${cost.toFixed(3)}`;
}

function usageTitle(u: Usage) {
  const bits = [u.model];
  if (u.prompt_tokens != null) bits.push(`${u.prompt_tokens} in`);
  if (u.completion_tokens != null) bits.push(`${u.completion_tokens} out`);
  // Reasoning tokens are billed at the completion rate but never shown in the
  // answer, which is the single biggest surprise on a reasoning model's bill.
  if (u.reasoning_tokens) bits.push(`${u.reasoning_tokens} reasoning`);
  return bits.join(" · ");
}

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  cheap: "Cheap",
  mid: "Mid",
  strong: "Strong",
};

/** Severity is the one place a hue is allowed to mean something. */
const SEVERITY: Record<string, { label: string; token: string }> = {
  low: { label: "Low", token: "var(--sev-low)" },
  medium: { label: "Medium", token: "var(--sev-medium)" },
  high: { label: "High", token: "var(--sev-high)" },
  critical: { label: "Critical", token: "var(--sev-critical)" },
};

/* ── small pieces ───────────────────────────────────────────────────────── */

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className="pill pill-quiet grid h-7 w-7 shrink-0 place-items-center"
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  copy,
  children,
}: {
  icon: React.ElementType;
  title: string;
  copy?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
      }}
      className="card p-5"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--violet)] text-[var(--paper)]">
            <Icon size={14} />
          </span>
          <h3 className="tag text-ink-2">{title}</h3>
        </div>
        {copy ? <CopyBtn text={copy} label={`Copy ${title}`} /> : null}
      </header>
      {children}
    </motion.section>
  );
}

/* ── shape drift ────────────────────────────────────────────────────────
   The prompt asks for arrays of strings, and most models oblige. Some do
   not: one returns probable_fixes as [{rank, fix}], another wraps steps as
   [{step: "..."}]. Rendering that raised "Objects are not valid as a React
   child" and took the whole page down, and the Markdown export wrote
   "[object Object]". Since the point of this tool is to run the same log
   past different models, the answer is to accept the drift rather than
   trust the contract. */

const TEXT_KEYS = ["fix", "step", "test", "text", "description", "title", "value", "name", "action"];

function asText(item: unknown): string {
  if (item == null) return "";
  if (typeof item === "string") return item;
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (Array.isArray(item)) return item.map(asText).filter(Boolean).join(" ");
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const k of TEXT_KEYS) {
      if (typeof obj[k] === "string" && obj[k]) return obj[k] as string;
    }
    // Nothing recognisable: show the first string value rather than nothing.
    const first = Object.values(obj).find((v) => typeof v === "string" && v);
    return (first as string) ?? JSON.stringify(item);
  }
  return String(item);
}

function asList(value: unknown): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(asText).filter(Boolean);
}

function normalise(raw: unknown): ParsedResult | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const score = Number(r.confidence_score);
  return {
    summary: asText(r.summary) || undefined,
    severity: typeof r.severity === "string" ? r.severity.toLowerCase().trim() : undefined,
    root_cause: asText(r.root_cause) || undefined,
    probable_fixes: asList(r.probable_fixes),
    reproduction_steps: asList(r.reproduction_steps),
    follow_up_tests: asList(r.follow_up_tests),
    confidence_score: Number.isFinite(score) ? score : undefined,
    notes: asText(r.notes) || undefined,
    tasks: Array.isArray(r.tasks)
      ? r.tasks.map((t, i) => {
          const o = (t && typeof t === "object" ? t : {}) as Record<string, unknown>;
          return {
            id: String(o.id ?? i),
            title: asText(o.title ?? t),
            description: asText(o.description) || undefined,
            priority: typeof o.priority === "string" ? o.priority : undefined,
          };
        })
      : undefined,
  };
}

/** A list where the order is the point: ranked fixes, ordered steps. */
function Ranked({ items, ordered = true }: { items: string[]; ordered?: boolean }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className={`mono mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-semibold ${
              ordered
                ? "bg-[var(--violet)] text-[var(--paper)]"
                : "bg-[var(--paper-sunk)] text-ink-3"
            }`}
          >
            {i + 1}
          </span>
          <span className="text-ink-2">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

export default function Home() {
  const [log, setLog] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState("");
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<{ title: string; message: string; suggestions: string[] } | null>(null);
  const [viewMode, setViewMode] = useState<"pretty" | "raw">("pretty");
  const [redactSecrets, setRedactSecrets] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [models, setModels] = useState<ModelChoice[]>([]);
  const [model, setModel] = useState<string>("");

  /* The picker is server-driven: the backend owns the allowlist, so the UI
     cannot ask for a model the key is not meant to be billed for. */
  useEffect(() => {
    let alive = true;
    fetch(`${API}/models`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setModels(d.models ?? []);
        setModel(d.default ?? d.models?.[0]?.id ?? "");
      })
      .catch(() => {
        /* backend down; analyse() surfaces that properly on first use */
      });
    return () => {
      alive = false;
    };
  }, []);

  const logRef = useRef<HTMLTextAreaElement>(null);
  const lineCount = log ? log.split(/\r?\n/).length : 0;

  /* Strip anything that looks like a credential before it leaves the browser. */
  const maskSecrets = (text: string) => {
    if (!text) return text;
    return text
      .replace(/(api[-_ ]?key|secret|token|password|pwd)\s*[:=]\s*([^\s"']+)/gi, (_m, k) => `${k}: ***`)
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ***")
      .replace(/([A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,})/g, "***")
      .replace(/\b[0-9a-f]{32,}\b/gi, "***")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "***@***");
  };

  const categorize = (status?: number, detail?: unknown) => {
    const text =
      typeof detail === "string"
        ? detail
        : detail && typeof detail === "object"
          ? String((detail as Record<string, unknown>).message ?? (detail as Record<string, unknown>).detail ?? "")
          : "";
    const low = text.toLowerCase();

    if (status === 401 || status === 403 || low.includes("unauthorized") || low.includes("forbidden"))
      return {
        title: "The API refused the request",
        message: "The key was rejected, so nothing was analysed.",
        suggestions: ["Check OPENROUTER_API_KEY in backend/.env", "Confirm the key is still active on openrouter.ai"],
      };
    if (status === 429 || low.includes("rate limit"))
      return {
        title: "Rate limited",
        message: "The model is refusing further requests for now.",
        suggestions: ["Wait a minute and retry", "Switch DEFAULT_MODEL to another free model"],
      };
    if (low.includes("fetch") || low.includes("network") || low.includes("failed to fetch"))
      return {
        title: "Cannot reach the backend",
        message: `Nothing is answering at ${API}.`,
        suggestions: ["Start it with ./run.sh", "Check the port in NEXT_PUBLIC_API_URL"],
      };
    return {
      title: "That did not work",
      message: text || "The request failed before a result came back.",
      suggestions: ["Try again", "Check the backend logs for the traceback"],
    };
  };

  const analyze = useCallback(async () => {
    if (!log.trim() || loading) return;
    setLoading(true);
    setStreaming(true);
    setResult(null);
    setError(null);
    setPartial("");
    setProgressStep(0);

    const body = JSON.stringify({
      raw_log: redactSecrets ? maskSecrets(log) : log,
      context: redactSecrets ? maskSecrets(context) : context,
      model: model || undefined,
    });

    try {
      const res = await fetch(`${API}/explain/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      // Older backends have no streaming route; fall back to the plain one.
      if (!res.ok || !res.body) {
        const plain = await fetch(`${API}/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!plain.ok) {
          let detail: unknown = null;
          try {
            detail = await plain.json();
          } catch {
            /* body was not JSON */
          }
          setError(categorize(plain.status, detail));
          return;
        }
        setResult(await plain.json());
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          let type = "message";
          let data = "";
          for (const line of evt.split("\n")) {
            if (line.startsWith("event: ")) type = line.slice(7).trim();
            if (line.startsWith("data: ")) data += line.slice(6);
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data);
            if (type === "status") setProgressStep(payload.step ?? 0);
            else if (type === "chunk") setPartial((prev) => prev + (payload.content ?? ""));
            else if (type === "final") {
              setResult(payload);
              setStreaming(false);
            } else if (type === "error") {
              setError(categorize(undefined, payload));
              setStreaming(false);
            }
          } catch {
            /* a partial SSE frame; the next read completes it */
          }
        }
      }
    } catch (err) {
      setError(categorize(undefined, err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [log, context, loading, redactSecrets, model]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        analyze();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analyze]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setLog(await file.text());
  }, []);

  const download = (name: string, body: string, type: string) => {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    const p = result?.parsed;
    const out: string[] = ["# Log analysis"];
    if (!p) out.push("\n```\n" + (result?.raw_llm ?? "") + "\n```");
    else {
      if (p.summary) out.push(`\n## Summary\n${p.summary}`);
      if (p.severity) out.push(`\n**Severity:** ${p.severity}`);
      if (typeof p.confidence_score === "number") out.push(`**Confidence:** ${p.confidence_score}%`);
      if (p.root_cause) out.push(`\n## Root cause\n${p.root_cause}`);
      if (p.probable_fixes?.length) out.push("\n## Probable fixes\n" + p.probable_fixes.map((f, i) => `${i + 1}. ${f}`).join("\n"));
      if (p.reproduction_steps?.length) out.push("\n## Reproduction\n" + p.reproduction_steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
      if (p.follow_up_tests?.length) out.push("\n## Tests to run\n" + p.follow_up_tests.map((t) => `- ${t}`).join("\n"));
      if (p.tasks?.length) out.push("\n## Tasks\n" + p.tasks.map((t) => `- [ ] ${t.title}${t.priority ? ` (${t.priority})` : ""}`).join("\n"));
      if (p.notes) out.push(`\n## Notes\n${p.notes}`);
    }
    download("log-analysis.md", out.join("\n"), "text/markdown");
  };

  const parsed = normalise(result?.parsed);
  const sev = parsed?.severity ? SEVERITY[parsed.severity.toLowerCase()] : undefined;

  return (
    <div className="min-h-screen">
      {/* ── bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-5 md:px-8">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rotate-45 bg-[var(--violet)]" aria-hidden />
            <span className="font-semibold tracking-tight">AI Log Explainer</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/hussainwaz/AI-Log-Explainer"
              target="_blank"
              rel="noopener noreferrer"
              className="pill pill-ghost hidden px-4 py-2 text-[13px] sm:block"
            >
              Source
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-5 pb-24 pt-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <div>
            <p className="tag text-[var(--violet)]">Paste it. Understand it.</p>
            <h1 className="display mt-2 text-[clamp(1.7rem,1.1rem+1.9vw,2.5rem)]">
              A wall of log output, explained in one pass<span className="text-[var(--violet)]">.</span>
            </h1>
          </div>
          <p className="max-w-[38ch] text-sm text-ink-2">
            Root cause, ranked fixes, and what to check next. Credentials are stripped in your browser
            before anything is sent.
          </p>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          {/* ── input ──────────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`sheet-night relative overflow-hidden transition-shadow ${
                isDragging ? "ring-2 ring-[var(--violet-bright)]" : ""
              }`}
            >
              <div className="flex items-center justify-between border-b border-[var(--line-night)] px-4 py-3">
                <span className="tag flex items-center gap-2 text-[var(--on-night-2)]">
                  <Terminal size={13} /> Log
                </span>
                <span className="mono text-[11px] text-[var(--on-night-2)]">
                  {lineCount} {lineCount === 1 ? "line" : "lines"} · {log.length} chars
                </span>
              </div>

              <textarea
                ref={logRef}
                value={log}
                onChange={(e) => setLog(e.target.value)}
                spellCheck={false}
                placeholder={"Paste a stack trace, an nginx error, a crash dump…\n\nCmd+Enter to analyse."}
                className="logfield mono scroll-slim h-[340px] w-full px-4 py-4 text-[12.5px] leading-[1.65]"
              />

              <AnimatePresence>
                {isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 grid place-items-center bg-[var(--night)]/85"
                  >
                    <span className="flex items-center gap-2 text-sm text-[var(--on-night)]">
                      <Upload size={16} /> Drop the file
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="tag mr-1 text-ink-3">Try</span>
              {SAMPLES.map((s) => (
                <button key={s.label} onClick={() => setLog(s.value)} className="pill pill-quiet px-3 py-1.5 text-[12px]">
                  {s.label}
                </button>
              ))}
            </div>

            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Context, optional. Node 20 behind nginx, Postgres 15…"
              className="mt-3 w-full rounded-2xl border border-[var(--line-strong)] bg-transparent px-4 py-3 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none focus-visible:outline-2"
            />

            {models.length > 0 && (
              <label className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--line-strong)] px-4 py-2.5">
                <span className="tag flex shrink-0 items-center gap-1.5 text-ink-3">
                  <Cpu size={12} /> Model
                </span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-right text-[13px] font-medium text-ink focus:outline-none"
                >
                  {(["free", "cheap", "mid", "strong"] as const).map((tier) => {
                    const group = models.filter((m) => m.tier === tier);
                    if (!group.length) return null;
                    return (
                      <optgroup key={tier} label={TIER_LABEL[tier]}>
                        {group.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </label>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button onClick={analyze} disabled={!log.trim() || loading} className="pill pill-solid flex items-center gap-2 px-6 py-3">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {loading ? "Analysing" : "Analyse"}
              </button>
              <button
                onClick={() => {
                  setLog("");
                  setContext("");
                  setResult(null);
                  setError(null);
                  logRef.current?.focus();
                }}
                className="pill pill-ghost flex items-center gap-2 px-4 py-3"
              >
                <Eraser size={14} /> Clear
              </button>
              <button
                onClick={() => setRedactSecrets((v) => !v)}
                aria-pressed={redactSecrets}
                title="Mask keys, tokens and emails before sending"
                className={`pill flex items-center gap-2 px-4 py-3 text-[13px] ${
                  redactSecrets ? "pill-solid" : "pill-ghost"
                }`}
              >
                <ShieldCheck size={14} /> Redact
              </button>
            </div>
          </div>

          {/* ── output ─────────────────────────────────────────────────── */}
          <div className="min-h-[420px]">
            <AnimatePresence mode="wait">
              {/* idle */}
              {!loading && !result && !error && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="card grid h-full min-h-[420px] place-items-center p-10 text-center"
                >
                  <div>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--paper-sunk)] text-ink-3">
                      <ScrollText size={20} />
                    </span>
                    <p className="mt-4 font-medium">Nothing to explain yet</p>
                    <p className="mt-1 text-sm text-ink-3">Paste a log on the left, or pick one of the samples.</p>
                  </div>
                </motion.div>
              )}

              {/* working */}
              {loading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card p-6">
                  <ol className="space-y-3">
                    {STEPS.map((step, i) => {
                      const state = i < progressStep ? "done" : i === progressStep ? "active" : "todo";
                      return (
                        <li key={step} className="flex items-center gap-3">
                          <span
                            className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors ${
                              state === "done"
                                ? "bg-[var(--ok)] text-[var(--paper)]"
                                : state === "active"
                                  ? "bg-[var(--violet)] text-[var(--paper)]"
                                  : "bg-[var(--paper-sunk)] text-ink-3"
                            }`}
                          >
                            {state === "done" ? <Check size={12} /> : i + 1}
                          </span>
                          <span className={state === "todo" ? "text-ink-3" : "text-ink"}>{step}</span>
                          {state === "active" && <Loader2 size={13} className="animate-spin text-[var(--violet)]" />}
                        </li>
                      );
                    })}
                  </ol>

                  {streaming && partial && (
                    <div className="sheet-night mono scroll-slim mt-5 max-h-64 overflow-auto p-4 text-[12px] leading-relaxed">
                      <span className="caret whitespace-pre-wrap break-words text-[var(--on-night-2)]">{partial.slice(-1400)}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* failed */}
              {error && !loading && (
                <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card p-6">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--sev-high)] text-[var(--paper)]">
                      <AlertTriangle size={15} />
                    </span>
                    <div>
                      <h3 className="font-semibold">{error.title}</h3>
                      <p className="mt-1 text-sm text-ink-2">{error.message}</p>
                      <ul className="mt-3 space-y-1.5">
                        {error.suggestions.map((s) => (
                          <li key={s} className="flex gap-2 text-sm text-ink-3">
                            <span className="text-[var(--violet)]">→</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                      <button onClick={analyze} className="pill pill-ghost mt-4 px-4 py-2 text-[13px]">
                        Try again
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* result */}
              {result && !loading && (
                <motion.div key="result" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-4">
                  {/* verdict strip */}
                  <motion.div
                    variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                    className="card flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div className="flex items-center gap-5">
                      {sev && (
                        <div>
                          <p className="tag text-ink-3">Severity</p>
                          <p className="mt-1 flex items-center gap-2 font-semibold">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: sev.token }} />
                            {sev.label}
                          </p>
                        </div>
                      )}
                      {typeof parsed?.confidence_score === "number" && (
                        <div className="min-w-[140px]">
                          <p className="tag flex items-center gap-1.5 text-ink-3">
                            <Gauge size={11} /> Confidence
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--paper-sunk)]">
                              <motion.span
                                initial={{ width: 0 }}
                                animate={{ width: `${parsed.confidence_score}%` }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                                className="block h-full rounded-full bg-[var(--violet)]"
                              />
                            </span>
                            <span className="mono text-[12px] text-ink-2">{parsed.confidence_score}%</span>
                          </div>
                        </div>
                      )}
                      {result?.usage && (
                        <div>
                          <p className="tag flex items-center gap-1.5 text-ink-3">
                            <Coins size={11} /> Cost
                          </p>
                          <p className="mono mt-1 text-[13px]" title={usageTitle(result.usage)}>
                            {formatCost(result.usage.cost)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex rounded-full border border-[var(--line-strong)] p-0.5">
                        {(["pretty", "raw"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setViewMode(m)}
                            className={`pill flex items-center gap-1.5 px-3 py-1.5 text-[12px] ${
                              viewMode === m ? "bg-[var(--ink)] text-[var(--paper)]" : "text-ink-3"
                            }`}
                          >
                            {m === "pretty" ? <ScrollText size={12} /> : <Braces size={12} />}
                            {m === "pretty" ? "Report" : "JSON"}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => download("log-analysis.json", JSON.stringify(parsed ?? result, null, 2), "application/json")}
                        className="pill pill-quiet grid h-8 w-8 place-items-center"
                        title="Download JSON"
                      >
                        <FileJson size={14} />
                      </button>
                      <button onClick={exportMarkdown} className="pill pill-quiet grid h-8 w-8 place-items-center" title="Download Markdown">
                        <Download size={14} />
                      </button>
                    </div>
                  </motion.div>

                  {viewMode === "raw" || !parsed ? (
                    <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="sheet-night scroll-slim overflow-auto p-5">
                      <pre className="mono whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--on-night-2)]">
                        {parsed ? JSON.stringify(parsed, null, 2) : result?.raw_llm}
                      </pre>
                    </motion.div>
                  ) : (
                    <>
                      {parsed.summary && (
                        <Section icon={ScrollText} title="Summary" copy={parsed.summary}>
                          <p className="text-[17px] leading-relaxed">{parsed.summary}</p>
                        </Section>
                      )}
                      {parsed.root_cause && (
                        <Section icon={Crosshair} title="Root cause" copy={parsed.root_cause}>
                          <p className="text-ink-2">{parsed.root_cause}</p>
                        </Section>
                      )}
                      {!!parsed.probable_fixes?.length && (
                        <Section icon={Wrench} title="Probable fixes, ranked" copy={parsed.probable_fixes.join("\n")}>
                          <Ranked items={parsed.probable_fixes} />
                        </Section>
                      )}
                      {!!parsed.reproduction_steps?.length && (
                        <Section icon={ListOrdered} title="Reproduction" copy={parsed.reproduction_steps.join("\n")}>
                          <Ranked items={parsed.reproduction_steps} />
                        </Section>
                      )}
                      {!!parsed.follow_up_tests?.length && (
                        <Section icon={FlaskConical} title="Tests to run" copy={parsed.follow_up_tests.join("\n")}>
                          <Ranked items={parsed.follow_up_tests} ordered={false} />
                        </Section>
                      )}
                      {!!parsed.tasks?.length && (
                        <Section icon={ClipboardList} title="Tasks">
                          <ul className="space-y-2">
                            {parsed.tasks.map((t) => (
                              <li key={t.id} className="flex items-start gap-3 rounded-xl bg-[var(--paper-sunk)] px-3.5 py-3">
                                <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-[var(--line-strong)]" />
                                <span>
                                  <span className="font-medium">{t.title}</span>
                                  {t.priority && <span className="tag ml-2 text-[var(--violet)]">{t.priority}</span>}
                                  {t.description && <span className="mt-0.5 block text-sm text-ink-3">{t.description}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}
                      {parsed.notes && (
                        <Section icon={StickyNote} title="Notes" copy={parsed.notes}>
                          <p className="text-ink-2">{parsed.notes}</p>
                        </Section>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] py-7">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-5 text-sm text-ink-3 md:px-8">
          <span>
            Built by{" "}
            <a href="https://hussainnawaz.vercel.app" className="text-ink underline underline-offset-4">
              Hussain Nawaz
            </a>
          </span>
          <span className="mono text-[12px]">⌘ + ⏎ to analyse</span>
        </div>
      </footer>
    </div>
  );
}
