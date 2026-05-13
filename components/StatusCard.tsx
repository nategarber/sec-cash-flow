"use client";

import { useState } from "react";
import type { CashFlowRow } from "@/lib/cash-flow-mapper";

interface CashFlowResult {
  ticker: string;
  companyName: string;
  filingDate: string;
  reportDate: string;
  accessionNumber: string;
  fiscalYears: string[];
  rows: CashFlowRow[];
}

interface Props {
  loading: boolean;
  error: string | null;
  result: CashFlowResult | null;
}

const SECTION_LABELS: { [k: string]: string } = {
  Operating: "Operating Activities",
  Investing: "Investing Activities",
  Financing: "Financing Activities",
  Summary: "Net Change in Cash",
};

function formatNumber(val: number | null): string {
  if (val === null || val === undefined) return "—";
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

export default function StatusCard({ loading, error, result }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.ticker}_cash_flow_${result.filingDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate Excel file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-zinc-400">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-indigo-500" />
        <p className="text-sm">Fetching from SEC EDGAR…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-800/60 bg-red-950/40 px-6 py-5 text-red-300">
        <p className="font-semibold">Error</p>
        <p className="mt-1 text-sm opacity-80">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const sections = ["Operating", "Investing", "Financing", "Summary"];
  const rowsBySection: { [s: string]: CashFlowRow[] } = {};
  for (const row of result.rows) {
    if (!rowsBySection[row.section]) rowsBySection[row.section] = [];
    rowsBySection[row.section].push(row);
  }

  return (
    <div className="w-full space-y-5">
      {/* Company header + download */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-700 bg-zinc-800/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{result.companyName}</h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            10-K filed {result.filingDate} &nbsp;·&nbsp; Most recent report date {result.reportDate}
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          {downloading ? "Building…" : "Download Excel"}
        </button>
      </div>

      {/* Fiscal year columns header */}
      <div className="overflow-x-auto rounded-xl border border-zinc-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/80">
              <th className="py-3 pl-5 pr-4 text-left font-medium text-zinc-400">Line Item</th>
              {result.fiscalYears.map((fy) => (
                <th key={fy} className="py-3 px-4 text-right font-medium text-zinc-400">
                  FY {fy}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const sRows = rowsBySection[section];
              if (!sRows?.length) return null;
              return (
                <>
                  <tr key={`header-${section}`} className="border-t border-zinc-700/50 bg-zinc-900/60">
                    <td
                      colSpan={result.fiscalYears.length + 1}
                      className="py-2 pl-5 text-xs font-semibold uppercase tracking-widest text-indigo-400"
                    >
                      {SECTION_LABELS[section] ?? section}
                    </td>
                  </tr>
                  {sRows.map((row) => (
                    <tr
                      key={row.concept}
                      className={`border-t border-zinc-800 transition-colors hover:bg-zinc-800/40 ${row.bold ? "bg-zinc-800/30" : ""}`}
                    >
                      <td className={`py-2.5 pl-5 pr-4 ${row.bold ? "font-semibold text-white" : "text-zinc-300"}`}>
                        {row.label}
                      </td>
                      {result.fiscalYears.map((fy) => {
                        const val = row.values[fy] ?? null;
                        const isNeg = val !== null && val < 0;
                        return (
                          <td
                            key={fy}
                            className={`py-2.5 px-4 text-right tabular-nums ${
                              row.bold ? "font-semibold text-white" : isNeg ? "text-red-400" : "text-zinc-300"
                            }`}
                          >
                            {formatNumber(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Source: SEC EDGAR · Values as reported in USD · Hover values show millions/billions abbreviated
      </p>
    </div>
  );
}
