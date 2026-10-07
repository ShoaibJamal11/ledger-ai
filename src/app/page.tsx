"use client";

import Image from "next/image";
import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  Sparkles,
  Loader2,
  PackageOpen,
  X,
  Copy,
  Check,
  Building2,
  CalendarDays,
  Receipt,
  DollarSign,
  AlertCircle,
  Zap,
  FileText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  description: string;
  amount: string;
}

interface ExtractionResult {
  vendorName: string | null;
  date: string | null;
  tax: string | null;
  totalAmount: string | null;
  lineItems: LineItem[];
}

type OutputState = "idle" | "loading" | "done" | "error";

// ---------------------------------------------------------------------------
// Loading messages
// ---------------------------------------------------------------------------

const LOADING_STEPS = [
  "Uploading document to Groq LPU™…",
  "Running vision model inference…",
  "Extracting financial entities…",
  "Parsing line items…",
  "Structuring JSON output…",
];

function useLoadingMessage(active: boolean) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) {
      const t = setTimeout(() => setIdx(0), 0);
      return () => clearTimeout(t);
    }
    const id = setInterval(
      () => setIdx((i) => (i + 1) % LOADING_STEPS.length),
      1800
    );
    return () => clearInterval(id);
  }, [active]);
  return LOADING_STEPS[idx];
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function ErrorToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-red-500/30 bg-[#1a1033] px-4 py-3 shadow-2xl shadow-red-900/30 backdrop-blur-md">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-red-300">Extraction failed</p>
        <p className="mt-0.5 text-xs text-red-400/80 break-all">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-auto shrink-0 text-slate-500 hover:text-slate-300 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col gap-2 rounded-2xl border p-4 transition",
        accent
          ? "border-violet-500/40 bg-gradient-to-br from-violet-600/20 to-indigo-600/10"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${accent ? "text-violet-400" : "text-slate-400"}`}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <p
        className={`text-xl font-bold leading-none tracking-tight ${
          accent ? "text-violet-300" : "text-slate-100"
        }`}
      >
        {value ?? (
          <span className="text-slate-600 text-base font-normal">—</span>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy JSON button
// ---------------------------------------------------------------------------

function CopyButton({ data }: { data: object }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copy JSON
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Upload column
// ---------------------------------------------------------------------------

interface UploadColumnProps {
  onExtract: (base64: string) => void;
  isLoading: boolean;
}

function UploadColumn({ onExtract, isLoading }: UploadColumnProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const base64Ref = useRef<string | null>(null);

  const readFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      base64Ref.current = result;
      if (f.type.startsWith("image/")) setPreview(result);
      else setPreview(null);
    };
    reader.readAsDataURL(f);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    base64Ref.current = null;
  };

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) readFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: isLoading,
  });

  const handleExtract = () => {
    if (base64Ref.current) onExtract(base64Ref.current);
  };

  const loadingMsg = useLoadingMessage(isLoading);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Upload Invoice</h2>
        <p className="mt-1 text-sm text-slate-400">
          Drag &amp; drop or click to select a JPG, PNG, or PDF.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={[
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all duration-200",
          file ? "min-h-56 cursor-default p-2" : "cursor-pointer px-6 py-14",
          isDragActive
            ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
            : file
            ? "border-white/10 bg-white/5"
            : "border-white/15 bg-white/5 hover:border-violet-400/50 hover:bg-violet-500/5",
          isLoading ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="relative w-full">
            {preview ? (
              <Image
                src={preview}
                alt="Invoice preview"
                width={600}
                height={400}
                unoptimized
                className="mx-auto max-h-64 w-auto rounded-xl object-contain shadow-lg shadow-black/30"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <FileText className="h-12 w-12 opacity-50" strokeWidth={1} />
                <p className="text-sm font-medium text-slate-300">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB · PDF
                </p>
              </div>
            )}
            <button
              onClick={clear}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm transition hover:border-red-500/50 hover:text-red-400"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl p-4 ${
                isDragActive ? "bg-violet-500/20" : "bg-white/5"
              }`}
            >
              <UploadCloud
                className={`h-8 w-8 ${
                  isDragActive ? "text-violet-400" : "text-slate-500"
                }`}
                strokeWidth={1.5}
              />
            </div>
            {isDragActive ? (
              <p className="text-sm font-semibold text-violet-300">
                Drop to upload…
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-violet-400">
                  Click to browse
                </span>{" "}
                or drag &amp; drop
              </p>
            )}
            <p className="text-xs text-slate-600">JPG, PNG, PDF — max 10 MB</p>
          </>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={handleExtract}
        disabled={!file || isLoading}
        className={[
          "relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-4 text-sm font-bold transition-all duration-200",
          !file || isLoading
            ? "cursor-not-allowed bg-white/5 text-slate-500 border border-white/10"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/40 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-700/50 active:scale-[0.98]",
        ].join(" ")}
      >
        {/* Shimmer effect when active */}
        {file && !isLoading && (
          <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        )}
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingMsg}</span>
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Run AI Extraction
          </>
        )}
      </button>

      {/* Badge */}
      <p className="text-center text-xs text-slate-600">
        Powered by{" "}
        <span className="font-semibold text-slate-400">Groq LPU™</span>
        {" · "}
        <span className="font-semibold text-slate-400">Llama 3.2 Vision</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading panel
// ---------------------------------------------------------------------------

function LoadingPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-white/5 px-8 py-20 text-center">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-violet-500 opacity-10" />
        <span className="absolute inline-flex h-14 w-14 animate-ping rounded-full bg-violet-500 opacity-15 [animation-delay:300ms]" />
        <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl shadow-violet-900/50">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </span>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-200">
          Processing with Groq LPU™
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Usually under 3 seconds
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2.5">
        {[100, 75, 90, 55].map((w, i) => (
          <div
            key={i}
            className="h-2.5 animate-pulse rounded-full bg-white/10"
            style={{
              width: `${w}%`,
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Output column
// ---------------------------------------------------------------------------

interface OutputColumnProps {
  state: OutputState;
  result: ExtractionResult | null;
  error: string | null;
}

function OutputColumn({ state, result, error }: OutputColumnProps) {
  if (state === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] px-8 py-28 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <PackageOpen className="h-10 w-10 text-slate-600" strokeWidth={1} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-400">
            Extracted data will appear here
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-600">
            Upload an invoice and click{" "}
            <span className="font-medium text-slate-500">
              &ldquo;Run AI Extraction&rdquo;
            </span>{" "}
            to begin.
          </p>
        </div>
      </div>
    );
  }

  if (state === "loading") return <LoadingPanel />;

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-8 py-24 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-red-300">Extraction failed</p>
          <p className="mt-1 max-w-xs text-xs text-red-400/70 break-all">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header + copy */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Extraction Result</h2>
          <p className="mt-1 text-sm text-slate-400">
            Structured data extracted by Groq Vision AI.
          </p>
        </div>
        <CopyButton data={result} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <MetricCard icon={Building2} label="Vendor" value={result.vendorName} />
        </div>
        <MetricCard icon={CalendarDays} label="Date" value={result.date} />
        <MetricCard icon={Receipt} label="Tax" value={result.tax} />
        <div className="col-span-2">
          <MetricCard
            icon={DollarSign}
            label="Total Amount"
            value={result.totalAmount}
            accent
          />
        </div>
      </div>

      {/* Line items */}
      {result.lineItems?.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Line Items
            </h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-400">
              {result.lineItems.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-transparent">
                {result.lineItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className="transition hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-slate-300">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-100">
                      {item.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const [outputState, setOutputState] = useState<OutputState>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleExtract = useCallback(async (base64Image: string) => {
    setOutputState("loading");
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `Server error ${res.status}`);
      }

      setResult(data as ExtractionResult);
      setOutputState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setToast(msg);
      setOutputState("error");
    }
  }, []);

  return (
    // Deep dark indigo/slate background with subtle radial glow
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a14]">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-violet-700/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-700/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-900/5 blur-3xl" />

      {/* ── Navbar ── */}
      <header className="relative z-30 border-b border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-900/40">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-white">
              LedgerAI
            </span>
          </div>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-300">
            Beta
          </span>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs text-slate-500">API Connected</span>
            </div>
            <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-400">
              Groq LPU™
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="relative border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <span className="text-xs text-slate-600">Groq API connected</span>
          </div>
          <h1 className="mt-3 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Invoice Extraction Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Upload any invoice — JPG, PNG, or PDF — and LedgerAI extracts
            structured financial data in under 3 seconds using Groq&apos;s
            LPU™ inference.
          </p>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left — Upload */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <UploadColumn
              onExtract={handleExtract}
              isLoading={outputState === "loading"}
            />
          </div>

          {/* Right — Output */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
            <OutputColumn
              state={outputState}
              result={result}
              error={error}
            />
          </div>
        </div>
      </main>

      {/* ── Toast ── */}
      {toast && <ErrorToast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
