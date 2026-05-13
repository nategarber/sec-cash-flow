"use client";

import { useState, FormEvent } from "react";

interface Props {
  onSubmit: (ticker: string) => void;
  loading: boolean;
}

export default function TickerInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim().toUpperCase();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL"
          maxLength={10}
          disabled={loading}
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3.5 text-lg font-mono text-white placeholder-zinc-500 outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="rounded-xl bg-indigo-600 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Fetching…" : "Fetch"}
        </button>
      </div>
    </form>
  );
}
