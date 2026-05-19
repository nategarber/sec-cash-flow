"use client";

import { useState } from "react";
import TickerInput from "@/components/TickerInput";
import StatusCard from "@/components/StatusCard";
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

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CashFlowResult | null>(null);

  async function handleSearch(ticker: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/cash-flow?ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "An unexpected error occurred.");
      } else {
        setResult(data as CashFlowResult);
      }
    } catch {
      setError("Network error. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h10M3 18h6" />
              </svg>
            </div>
            <span className="font-semibold tracking-tight text-white">SEC Financials</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <span className="cursor-default text-indigo-400">Cash Flow</span>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Statement of Cash Flows
          </h1>
          <p className="mt-3 text-zinc-400">
            Enter a ticker or company name to pull the most recent 10-K from SEC EDGAR and download it as Excel.
          </p>
        </div>

        <div className="mx-auto max-w-xl">
          <TickerInput onSubmit={handleSearch} loading={loading} />
        </div>

        <div className="mt-10">
          <StatusCard loading={loading} error={error} result={result} />
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        Data sourced from{" "}
        <a
          href="https://www.sec.gov/developer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 underline-offset-2 hover:underline"
        >
          SEC EDGAR Public API
        </a>
        . Not financial advice.
      </footer>
    </div>
  );
}
