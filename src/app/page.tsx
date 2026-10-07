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
// Loading messages — cycle through for visual interest
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
      // Schedule the reset as a micro-task so setState isn't called
      // synchronously inside the effect body (react-hooks/set-state-in-effect).
      const t = setTimeout(() => setIdx(0), 0);
      return () => clearTimeout(t);
    }
    const id = setInterval(() => setIdx((i) => (i + 1) % LOADING_STEPS.length), 1800);
    return () => clearInterval(id);
  }, [active]);
  return LOADING_STEPS[idx];
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastProps {
  message: string;
  onClose: () => void;
}

function ErrorToast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-lg shadow-red-100 animate-in slide-in-from-bottom-4 duration-300">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-red-700">Extraction failed</p>
        <p className="mt-0.5 truncate text-xs text-red-500">{message}</p>
      </div>
      <button onClick={onClose} className="ml-auto shrink-0 text-slate-400 hover:text-slate-600">
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
        "flex flex-col gap-2 rounded-xl border p-4",
        accent
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${accent ? "text-blue-500" : "text-slate-400"}`}
        />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <p
        className={`text-xl font-bold leading-none tracking-tight ${
          accent ? "text-blue-700" : "text-slate-800"
        }`}
      >
        {value ?? <span className="text-slate-300 text-base font-normal">—</span>}
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
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!</>
      ) : (
        <><Copy className="h-3.5 w-3.5" /> Copy JSON</>
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
      else setPreview(null); // PDF — no inline preview
    };
    reader.readAsDataURL(f);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    base64Ref.current = null;
  };

  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted[0]) readFile(accepted[0]); },
    []
  );


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
        <h2 className="text-lg font-semibold text-slate-800">Upload Invoice</h2>
        <p className="mt-1 text-sm text-slate-500">
          Drag &amp; drop or click to select a JPG, PNG, or PDF.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={[
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
          file ? "min-h-56 cursor-default p-2" : "cursor-pointer px-6 py-14",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : file
            ? "border-slate-200 bg-slate-50"
            : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40",
          isLoading ? "pointer-events-none opacity-70" : "",
        ].join(" ")}
      >
        <input {...getInputProps()} />

        {file ? (
          /* ── File selected ── */
          <div className="relative w-full">
            {preview ? (
              /* Image preview */
              <Image
                src={preview}
                alt="Invoice preview"
                width={600}
                height={400}
                unoptimized
                className="mx-auto max-h-64 w-auto rounded-lg object-contain shadow-sm"
              />
            ) : (
              /* PDF placeholder */
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <Receipt className="h-12 w-12" strokeWidth={1} />
                <p className="text-sm font-medium text-slate-600">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB · PDF
                </p>
              </div>
            )}

            {/* Remove / change button */}
            <button
              onClick={clear}
              className="absolute right-1 top-1 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          /* ── Empty state ── */
          <>
            <div className={`rounded-full p-3 ${isDragActive ? "bg-blue-100" : "bg-slate-100"}`}>
              <UploadCloud
                className={`h-7 w-7 ${isDragActive ? "text-blue-500" : "text-slate-400"}`}
                strokeWidth={1.5}
              />
            </div>
            {isDragActive ? (
              <p className="text-sm font-semibold text-blue-600">Drop to upload…</p>
            ) : (
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-blue-600">Click to browse</span>
                {" "}or drag &amp; drop
              </p>
            )}
            <p className="text-xs text-slate-400">JPG, PNG, PDF — max 10 MB</p>
          </>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={handleExtract}
        disabled={!file || isLoading}
        className={[
          "flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all",
          !file || isLoading
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 active:scale-[0.98]",
        ].join(" ")}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="transition-all">{loadingMsg}</span>
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Run AI Extraction
          </>
        )}
      </button>

      {/* Powered by badge */}
      <p className="text-center text-xs text-slate-400">
        Powered by{" "}
        <span className="font-semibold text-slate-600">Groq LPU™</span>
        {" "}·{" "}
        <span className="font-semibold text-slate-600">Llama 4</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Output column
// ---------------------------------------------------------------------------

function LoadingPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-8 py-20 text-center">
      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-blue-400 opacity-20" />
        <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-200">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">Processing with Groq LPU™</p>
        <p className="mt-1 text-xs text-slate-400">This usually takes under 3 seconds</p>
      </div>
      {/* Skeleton rows */}
      <div className="w-full max-w-xs space-y-2">
        {[100, 80, 90, 60].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded-full bg-slate-200"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface OutputColumnProps {
  state: OutputState;
  result: ExtractionResult | null;
  error: string | null;
}

function OutputColumn({ state, result, error }: OutputColumnProps) {
  if (state === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-8 py-24 text-center">
        <PackageOpen className="h-12 w-12 text-slate-200" strokeWidth={1} />
        <p className="text-sm font-semibold text-slate-400">
          Extracted data will appear here
        </p>
        <p className="max-w-xs text-xs text-slate-300">
          Upload an invoice and click{" "}
          <span className="font-medium text-slate-400">&ldquo;Run AI Extraction&rdquo;</span>{" "}
          to begin.
        </p>
      </div>
    );
  }

  if (state === "loading") return <LoadingPanel />;

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-8 py-24 text-center">
        <AlertCircle className="h-10 w-10 text-red-300" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-red-600">Extraction failed</p>
        <p className="max-w-xs text-xs text-red-400">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header + copy */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Extraction Result</h2>
          <p className="mt-1 text-sm text-slate-500">
            Structured data extracted by Groq Vision AI.
          </p>
        </div>
        <CopyButton data={result} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <MetricCard
            icon={Building2}
            label="Vendor"
            value={result.vendorName}
          />
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
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Line Items
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {result.lineItems.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {result.lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{item.description}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
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
// Page (root)
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
    <div className="min-h-screen bg-slate-50">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-800">
              LedgerAI
            </span>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
            Beta
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:block">
              Powered by
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
              Groq LPU™
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <span className="text-xs text-slate-400">Groq API connected</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            Invoice Extraction Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Upload any invoice — JPG, PNG, or PDF — and LedgerAI extracts
            structured financial data in under 3 seconds using Groq&apos;s LPU™ inference.
          </p>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left — Upload */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <UploadColumn
              onExtract={handleExtract}
              isLoading={outputState === "loading"}
            />
          </div>

          {/* Right — Output */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <OutputColumn state={outputState} result={result} error={error} />
          </div>
        </div>
      </main>

      {/* ── Error toast ── */}
      {toast && <ErrorToast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
