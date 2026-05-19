"use client";

import { useState, FormEvent, useEffect, useRef } from "react";

interface Suggestion {
  ticker: string;
  name: string;
}

interface Props {
  onSubmit: (ticker: string) => void;
  loading: boolean;
}

export default function TickerInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    const trimmed = value.trim().toUpperCase();
    if (trimmed) {
      setShowDropdown(false);
      onSubmit(trimmed);
    }
  }

  function selectSuggestion(suggestion: Suggestion) {
    setValue(suggestion.ticker);
    setShowDropdown(false);
    onSubmit(suggestion.ticker);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div ref={containerRef} className="relative flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. AAPL or Apple Inc."
            disabled={loading}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3.5 text-lg font-mono text-white placeholder-zinc-500 outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {showDropdown && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl">
              {suggestions.map((s, i) => (
                <li
                  key={s.ticker}
                  onMouseDown={() => selectSuggestion(s)}
                  className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition ${
                    i === activeIndex ? "bg-indigo-600/30" : "hover:bg-zinc-700"
                  }`}
                >
                  <span className="w-16 shrink-0 font-mono text-sm font-semibold text-indigo-400">{s.ticker}</span>
                  <span className="truncate text-sm text-zinc-300">{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
