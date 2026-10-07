"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  PackageOpen,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineItem {
  description: string;
  qty: number;
  unitPrice: string;
  total: string;
}

interface ExtractionResult {
  vendorName: string;
  date: string;
  tax: string;
  totalAmount: string;
  lineItems: LineItem[];
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_RESULT: ExtractionResult = {
  vendorName: "Amazon Web Services",
  date: "2026-10-08",
  tax: "$4.50",
  totalAmount: "$124.50",
  lineItems: [
    {
      description: "EC2 On-Demand Instances (t3.medium × 720 hrs)",
      qty: 1,
      unitPrice: "$75.00",
      total: "$75.00",
    },
    {
      description: "S3 Standard Storage (50 GB)",
      qty: 50,
      unitPrice: "$0.90",
      total: "$45.00",
    },
  ],
};

// ---------------------------------------------------------------------------
// Upload column
// ---------------------------------------------------------------------------

interface UploadColumnProps {
  onExtract: () => void;
  isLoading: boolean;
}

function UploadColumn({ onExtract, isLoading }: UploadColumnProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Card header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Upload Invoice</h2>
        <p className="mt-1 text-sm text-slate-500">
          Drag &amp; drop or click to select a JPG, PNG, or PDF file.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer select-none",
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40",
        ].join(" ")}
      >
        <input {...getInputProps()} />
        <UploadCloud
          className={`h-10 w-10 ${isDragActive ? "text-blue-500" : "text-slate-400"}`}
          strokeWidth={1.5}
        />
        {isDragActive ? (
          <p className="text-sm font-medium text-blue-600">Drop it here…</p>
        ) : (
          <p className="text-sm text-slate-500">
            <span className="font-medium text-blue-600">Click to browse</span>{" "}
            or drag &amp; drop
          </p>
        )}
        <p className="text-xs text-slate-400">JPG, PNG, PDF — up to 10 MB</p>
      </div>

      {/* Selected file badge */}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-blue-500" />
          <span className="truncate text-sm font-medium text-slate-700">
            {file.name}
          </span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
      )}

      {/* CTA button */}
      <button
        onClick={onExtract}
        disabled={!file || isLoading}
        className={[
          "flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors",
          !file || isLoading
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
        ].join(" ")}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Extracting…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Run AI Extraction
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Output column
// ---------------------------------------------------------------------------

type OutputState = "idle" | "loading" | "done";

interface OutputColumnProps {
  state: OutputState;
  result: ExtractionResult | null;
}

function OutputColumn({ state, result }: OutputColumnProps) {
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-20 text-center">
        <PackageOpen className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-slate-400">
          Extracted JSON will appear here
        </p>
        <p className="text-xs text-slate-300">
          Upload an invoice and click &ldquo;Run AI Extraction&rdquo; to start.
        </p>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-500">
          Analysing your invoice with AI…
        </p>
      </div>
    );
  }

  // state === "done"
  if (!result) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Extraction Result
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Structured data extracted from the uploaded invoice.
        </p>
      </div>

      {/* Summary fields */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vendor Name" value={result.vendorName} span />
        <Field label="Invoice Date" value={result.date} />
        <Field label="Tax" value={result.tax} />
        <Field label="Total Amount" value={result.totalAmount} highlight />
      </div>

      {/* Line items table */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Line Items
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Description", "Qty", "Unit Price", "Total"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {result.lineItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-700">
                    {item.description}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.qty}</td>
                  <td className="px-4 py-3 text-slate-600">{item.unitPrice}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {item.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny Field component
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  span,
  highlight,
}: {
  label: string;
  value: string;
  span?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border border-slate-200 bg-white px-4 py-3",
        span ? "col-span-2" : "",
      ].join(" ")}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-0.5 text-base font-semibold ${highlight ? "text-blue-600" : "text-slate-800"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (root)
// ---------------------------------------------------------------------------

export default function Home() {
  const [outputState, setOutputState] = useState<OutputState>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const handleExtract = useCallback(() => {
    setOutputState("loading");
    setResult(null);

    setTimeout(() => {
      setResult(MOCK_RESULT);
      setOutputState("done");
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold tracking-tight text-slate-800">
            LedgerAI
          </span>
          <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            Beta
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Invoice Extraction Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Upload any invoice — JPG, PNG, or PDF — and LedgerAI will extract
            structured financial data in seconds using AI.
          </p>
        </div>
      </div>

      {/* Main two-column layout */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left — Upload */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <UploadColumn onExtract={handleExtract} isLoading={outputState === "loading"} />
          </div>

          {/* Right — Output */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <OutputColumn state={outputState} result={result} />
          </div>
        </div>
      </main>
    </div>
  );
}
