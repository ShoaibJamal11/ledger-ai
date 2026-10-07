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
  amount: string | number;
}

interface ExtractionResult {
  vendorName: string | null;
  date: string | null;
  tax: string | number | null;
  totalAmount: string | number | null;
  lineItems: LineItem[];
}

type OutputState = "idle" | "loading" | "done" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(val: string | number | null | undefined): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    return `$${val.toFixed(2)}`;
  }
  const str = String(val).trim();
  if (!str.startsWith("$") && !isNaN(Number(str))) {
    return `$${Number(str).toFixed(2)}`;
  }
  return str;
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
  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-xl shadow-red-100/60">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-red-700">Extraction failed</p>
        <p className="mt-0.5 text-xs text-red-500 leading-relaxed break-words">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-auto shrink-0 text-slate-400 hover:text-slate-600 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card (light)
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
        "flex flex-col gap-2 rounded-2xl border p-4 transition-all",
        accent
          ? "border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm shadow-violet-100"
          : "border-slate-200/80 bg-white shadow-sm",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${accent ? "text-violet-600" : "text-slate-400"}`}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <p
        className={`text-xl font-bold leading-none tracking-tight ${
          accent ? "text-violet-700" : "text-slate-800"
        }`}
      >
        {value ?? (
          <span className="text-slate-300 text-base font-normal">—</span>
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
      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-300 hover:text-violet-700 active:scale-95"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!
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
// Loading messages
// ---------------------------------------------------------------------------

const LOADING_STEPS = [
  "Uploading document to Groq Vision LPU™…",
  "Analyzing receipt layout & typography…",
  "Extracting financial entities & amounts…",
  "Resolving subtotal & verifying line items…",
  "Formatting structured JSON output…",
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
      1600
    );
    return () => clearInterval(id);
  }, [active]);
  return LOADING_STEPS[idx];
}

// ---------------------------------------------------------------------------
// Upload column
// ---------------------------------------------------------------------------

interface UploadColumnProps {
  onExtract: (base64Image: string) => void;
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
      if (f.type.startsWith("image/")) {
        setPreview(result);
      } else {
        setPreview(null);
      }
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
    if (base64Ref.current) {
      onExtract(base64Ref.current);
    }
  };

  const loadingMsg = useLoadingMessage(isLoading);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">Upload Invoice or Receipt</h2>
        <p className="mt-1 text-sm text-slate-500">
          Drag &amp; drop or click to select a JPG, PNG, or PDF file.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={[
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all duration-200",
          file ? "min-h-56 cursor-default p-2" : "cursor-pointer px-6 py-14",
          isDragActive
            ? "border-violet-400 bg-violet-50 scale-[1.01]"
            : file
            ? "border-slate-200 bg-slate-50"
            : "border-slate-200 bg-slate-50 hover:border-violet-400 hover:bg-violet-50/50",
          isLoading ? "pointer-events-none opacity-60" : "",
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
                className="mx-auto max-h-64 w-auto rounded-xl object-contain shadow-md shadow-slate-200"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <FileText
                  className="h-12 w-12 text-slate-300"
                  strokeWidth={1}
                />
                <p className="text-sm font-medium text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB · PDF
                </p>
              </div>
            )}
            <button
              onClick={clear}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-500"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          <>
            <div
              className={`rounded-2xl p-4 ${
                isDragActive ? "bg-violet-100" : "bg-white shadow-sm border border-slate-200"
              }`}
            >
              <UploadCloud
                className={`h-8 w-8 ${
                  isDragActive ? "text-violet-500" : "text-slate-400"
                }`}
                strokeWidth={1.5}
              />
            </div>
            {isDragActive ? (
              <p className="text-sm font-semibold text-violet-600">
                Drop to upload…
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-violet-600">
                  Click to browse
                </span>{" "}
                or drag &amp; drop
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
          "relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-4 text-sm font-bold transition-all duration-200",
          !file || isLoading
            ? "cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200"
            : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:from-violet-500 hover:to-indigo-500 hover:shadow-violet-300 active:scale-[0.98]",
        ].join(" ")}
      >
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

      {/* Badge without Tesseract */}
      <p className="text-center text-xs text-slate-400">
        Powered by{" "}
        <span className="font-semibold text-slate-600">Groq Vision LPU™</span>
        {" · "}
        <span className="font-semibold text-slate-600">Llama 3.2 Vision</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading panel
// ---------------------------------------------------------------------------

function LoadingPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-8 py-20 text-center shadow-sm">
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full bg-violet-400 opacity-15" />
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-xl shadow-violet-200">
          <Loader2 className="h-7 w-7 animate-spin text-white" />
        </span>
      </div>

      <div>
        <p className="text-base font-bold text-slate-800">
          Analyzing document via Groq Vision LPU™…
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Reading receipt layout, dates, subtotal, and extracting line items…
        </p>
      </div>

      {/* Skeleton rows */}
      <div className="w-full max-w-xs space-y-2.5">
        {[100, 75, 90, 60].map((w, i) => (
          <div
            key={i}
            className="h-2.5 animate-pulse rounded-full bg-slate-200/80"
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
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-8 py-28 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <PackageOpen className="h-10 w-10 text-slate-300" strokeWidth={1} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Extracted data will appear here
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-400">
            Upload an invoice or receipt and click{" "}
            <span className="font-medium text-slate-600">
              &ldquo;Run AI Extraction&rdquo;
            </span>{" "}
            to begin.
          </p>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return <LoadingPanel />;
  }

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50/80 px-6 py-20 text-center">
        <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
          <AlertCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
        </div>
        <div className="max-w-xs">
          <p className="text-sm font-bold text-red-600">Extraction failed</p>
          <p className="mt-2 text-xs text-red-500 leading-relaxed break-words">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const formattedTax = formatCurrency(result.tax);
  const formattedTotal = formatCurrency(result.totalAmount);

  return (
    <div className="flex flex-col gap-5">
      {/* Header + copy */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Extraction Result</h2>
          <p className="mt-1 text-sm text-slate-500">
            Structured financial data parsed by Groq Vision AI.
          </p>
        </div>
        <CopyButton data={result} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <MetricCard
            icon={Building2}
            label="Vendor"
            value={result.vendorName}
          />
        </div>
        <MetricCard icon={CalendarDays} label="Date" value={result.date} />
        <MetricCard icon={Receipt} label="Tax" value={formattedTax} />
        <div className="col-span-2">
          <MetricCard
            icon={DollarSign}
            label="Total Amount"
            value={formattedTotal}
            accent
          />
        </div>
      </div>

      {/* Line items table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Line Items
            </h3>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {result.lineItems?.length || 0}
            </span>
          </div>
        </div>

        {result.lineItems && result.lineItems.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.lineItems.map((item, idx) => (
                  <tr key={idx} className="transition hover:bg-violet-50/40">
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
            No individual line items detected on this receipt.
          </div>
        )}
      </div>
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
    // Light gradient background — soft indigo/slate
    <div className="relative min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50/60 text-slate-900">
      {/* Subtle background glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-violet-200/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-indigo-200/20 blur-3xl" />

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-200">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-800">
              LedgerAI
            </span>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-600">
            Beta
          </span>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500">API Connected</span>
            </div>
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              Groq Vision LPU™
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="border-b border-slate-200/60 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            <span className="text-xs text-slate-400">Groq Vision LPU™</span>
          </div>
          <h1 className="mt-3 bg-gradient-to-r from-slate-800 via-violet-700 to-indigo-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Invoice &amp; Receipt Extraction Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Upload any invoice or receipt — JPG, PNG, or PDF — and LedgerAI uses Groq&apos;s
            Vision LPU™ inference to accurately extract vendor names, dates, amounts, and line items.
          </p>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="relative mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left — Upload */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <UploadColumn
              onExtract={handleExtract}
              isLoading={outputState === "loading"}
            />
          </div>

          {/* Right — Output */}
          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
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
