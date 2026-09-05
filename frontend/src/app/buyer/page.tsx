"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

import MaterialIcon from "@/components/MaterialIcon";
import CompareAlternatives from "@/components/CompareAlternatives";
import MoneyValue from "@/components/MoneyValue";
import StatusBadge from "@/components/StatusBadge";
import {
  getBuyerData,
  getCommercePolicy,
  chatWithAgent,
  AgentChatResponse,
  CommercePolicy,
} from "@/lib/api";
import {
  getCachedSearch,
  saveSearchResult,
  getSearchHistory,
  removeSearchItem,
  clearSearchHistory,
  SearchHistoryItem,
} from "@/lib/search-history";

export default function BuyerPage() {
  const [query, setQuery] = useState("Find me a laptop for coding and gaming under ₹70,000.");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AgentChatResponse | null>(null);
  const [sessionId] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);

  const [buyerData, setBuyerData] = useState<{
    matchReasons: string[];
    suggestions: string[];
    alternatives: {
      matchColor?: string;
      dotColor?: string;
      matchPercent?: number;
      price?: string;
      name?: string;
      description?: string;
    }[];
  }>({ matchReasons: [], suggestions: [], alternatives: [] });

  const [policy, setPolicy] = useState<CommercePolicy | null>(null);

  const [loadingSteps, setLoadingSteps] = useState([
    { label: "Understanding request", done: false },
    { label: "Searching catalog", done: false },
    { label: "Comparing products", done: false },
    { label: "Selecting best match", done: false },
  ]);

  // Execute or retrace search with cache lookup
  const executeSearch = useCallback(
    async (searchQuery: string, forceNetwork = false) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      setError(null);

      // Check client-side search history cache first
      if (!forceNetwork) {
        const cached = getCachedSearch(trimmed);
        if (cached) {
          setQuery(cached.query);
          setResponse(cached.response);
          setIsFromCache(true);
          setIsLoading(false);
          setActiveSearchId(cached.id);
          // Mark all steps done immediately
          setLoadingSteps((prev) => prev.map((s) => ({ ...s, done: true })));
          return;
        }
      }

      // If not in cache or forced network refresh, call backend ML route
      setIsLoading(true);
      setIsFromCache(false);
      setResponse(null);

      // Reset steps
      setLoadingSteps([
        { label: "Understanding request", done: false },
        { label: "Searching catalog", done: false },
        { label: "Comparing products", done: false },
        { label: "Selecting best match", done: false },
      ]);

      const progressInterval = setInterval(() => {
        setLoadingSteps((prev) => {
          const next = [...prev];
          const firstUndone = next.findIndex((s) => !s.done);
          if (firstUndone !== -1 && firstUndone < next.length - 1) {
            next[firstUndone].done = true;
          }
          return next;
        });
      }, 1200);

      try {
        const res = await chatWithAgent(trimmed, sessionId || undefined);
        setResponse(res);
        setLoadingSteps((prev) => prev.map((s) => ({ ...s, done: true })));

        // Save result in client-side search history
        const savedItem = saveSearchResult(trimmed, res);
        setActiveSearchId(savedItem.id);
        setSearchHistory(getSearchHistory());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred during AI search");
      } finally {
        clearInterval(progressInterval);
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  const handleRetrace = useCallback((item: SearchHistoryItem) => {
    setQuery(item.query);
    setResponse(item.response);
    setIsFromCache(true);
    setError(null);
    setActiveSearchId(item.id);
    setLoadingSteps((prev) => prev.map((s) => ({ ...s, done: true })));
  }, []);

  // Load initial static data and auto-populate recommendation so page is never empty
  useEffect(() => {
    Promise.all([getBuyerData(), getCommercePolicy()])
      .then(([bData, policyData]) => {
        setBuyerData(bData);
        setPolicy(policyData);
      })
      .catch((err) => console.error("Failed to load initial data", err));

    const history = getSearchHistory();
    setSearchHistory(history);

    // Auto-populate: retrace latest cached search or execute default query
    if (history.length > 0) {
      handleRetrace(history[0]);
    } else {
      executeSearch("Find me a laptop for coding and gaming under ₹70,000.");
    }
  }, [executeSearch, handleRetrace]);

  const handleRemoveHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = removeSearchItem(id);
    setSearchHistory(updated);
    if (activeSearchId === id) {
      setActiveSearchId(null);
    }
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
    setActiveSearchId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(query);
    }
  };

  const hasConversation = isLoading || !!response || !!error;
  const recommendedProduct = response?.products.find(
    (p) => p.id === response.recommended_product_id
  );

  const displayAlternatives =
    response?.products
      .filter((p) => p.id !== response.recommended_product_id)
      .map((p) => ({
        name: p.name,
        price: p.priceFormatted,
        matchPercent: p.matchPercent || 85,
        description: p.specs || p.description,
        matchColor: "text-primary",
        dotColor: "bg-primary",
      })) || buyerData.alternatives;

  return (
    <main className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden w-full max-w-7xl mx-auto px-md md:px-lg py-2.5 sm:py-3 flex flex-col gap-2.5">
      {/* ── TOP SEARCH SECTION ────────────────────────────────────────────── */}
      <div className="w-full flex flex-col gap-1.5 shrink-0">
        {/* Search Bar on Top */}
        <div className="w-full bg-surface-container/80 border border-white/10 rounded-xl p-1.5 sm:p-2 shadow-md backdrop-blur-md flex items-center gap-sm transition-all duration-300 focus-within:border-primary-container/60 focus-within:ring-2 focus-within:ring-primary-container/20">
          <div className="pl-2 flex items-center text-primary shrink-0">
            <MaterialIcon icon="auto_awesome" size={20} className="animate-pulse" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask your AI agent (e.g. 'Laptop for coding under ₹70,000' or 'Best camera phone under ₹80,000')..."
            className="flex-1 bg-transparent border-none text-body-md text-on-background placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0 px-2 py-1"
          />

          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery("");
                setResponse(null);
                setActiveSearchId(null);
                setIsFromCache(false);
              }}
              className="text-on-surface-variant hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              title="Clear search and explore categories"
            >
              <MaterialIcon icon="close" size={16} />
            </button>
          )}

          {/* Search Action Button */}
          <button
            onClick={() => executeSearch(query)}
            disabled={isLoading || !query.trim()}
            className="btn-primary shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs sm:text-sm disabled:opacity-40 shadow-sm transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <MaterialIcon icon="progress_activity" size={16} className="animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <MaterialIcon icon="search" size={16} />
                <span className="hidden sm:inline">Search Catalog</span>
              </>
            )}
          </button>
        </div>

        {/* ── SEARCH HISTORY & RETRACE BAR ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-xs text-xs px-1">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="flex items-center gap-1 text-on-surface-variant/70 font-mono text-[11px] uppercase tracking-wider shrink-0">
              <MaterialIcon icon="history" size={13} />
              Recent:
            </span>

            {searchHistory.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {searchHistory.slice(0, 4).map((item) => {
                  const isActive = activeSearchId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleRetrace(item)}
                      className={`group flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-primary-container/20 text-primary border-primary/40 shadow-sm"
                          : "bg-surface-container/60 text-on-surface-variant hover:text-white hover:bg-surface-container-high border-white/5"
                      }`}
                      title={`Retrace: "${item.query}"`}
                    >
                      <span className="truncate max-w-[150px] sm:max-w-[220px]">{item.query}</span>
                      <span
                        onClick={(e) => handleRemoveHistoryItem(e, item.id)}
                        className="text-on-surface-variant/40 hover:text-error ml-0.5 transition-colors p-0.5"
                        title="Remove from history"
                      >
                        <MaterialIcon icon="close" size={11} />
                      </span>
                    </button>
                  );
                })}
                <button
                  onClick={handleClearHistory}
                  className="text-on-surface-variant/40 hover:text-on-surface text-[10px] underline underline-offset-2 ml-0.5 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            ) : (
              /* Suggestions if history is empty */
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.isArray(buyerData.suggestions) &&
                  buyerData.suggestions.slice(0, 3).map((s: string) => (
                    <button
                      key={s}
                      onClick={() => {
                        setQuery(s);
                        executeSearch(s);
                      }}
                      className="border border-white/10 px-2 py-0.5 rounded-full text-[11px] text-on-surface-variant hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Instant Cache Status Indicator */}
          {response && (
            <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
              {isFromCache ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <MaterialIcon icon="bolt" size={12} />
                  Retraced (0 API calls)
                </span>
              ) : (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  <MaterialIcon icon="cloud_done" size={12} />
                  Live ML Saved
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (2 Columns, locked to viewport height) ──────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden">
        {/* Left Column: Agent Reasoning & Policy Controls */}
        <div className="md:col-span-4 h-full flex flex-col gap-2.5 overflow-y-auto custom-scrollbar pr-1">
          {/* Agent Status & Steps */}
          <div className="bg-surface-container/50 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-dot" />
                <span className="text-label-caps text-on-surface font-semibold tracking-wider text-xs">
                  AI Agent Reasoning
                </span>
              </div>
              {isFromCache && (
                <span className="text-[10px] font-mono uppercase bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">
                  Cached
                </span>
              )}
            </div>

            {/* Loading Steps */}
            <ul className="flex flex-col gap-1.5 text-xs">
              {loadingSteps.map((step, idx) => {
                const delay = (idx + 1) * 100;
                const delayClass = delay <= 500 ? `delay-${delay}` : "delay-500";
                const isStepCompleted = step.done || (!isLoading && hasConversation);
                return (
                  <li
                    key={step.label}
                    className={`flex items-center gap-2 transition-colors ${delayClass} ${
                      isLoading && !step.done
                        ? "text-primary font-medium"
                        : isStepCompleted
                        ? "text-on-surface"
                        : "text-on-surface-variant/50"
                    }`}
                  >
                    {isStepCompleted ? (
                      <MaterialIcon icon="check_circle" size={15} className="text-primary shrink-0" fill />
                    ) : isLoading && !step.done ? (
                      <MaterialIcon icon="progress_activity" size={15} className="animate-spin text-primary shrink-0" />
                    ) : (
                      <MaterialIcon icon="radio_button_unchecked" size={15} className="text-on-surface-variant/40 shrink-0" />
                    )}
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ul>

            {/* Agent Message */}
            {response?.message && (
              <div className="border-t border-white/5 pt-2">
                <p className="text-xs text-on-background/90 whitespace-pre-wrap leading-relaxed line-clamp-4">
                  {response.message}
                </p>
              </div>
            )}

            {/* Intent Breakdown */}
            {response?.intent && (
              <div className="border-t border-white/5 pt-2 flex flex-col gap-1 text-[11px] font-mono">
                <span className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">
                  Extracted Constraints
                </span>
                {response.intent.category && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Category:</span>
                    <span className="text-on-surface capitalize font-semibold">{response.intent.category}</span>
                  </div>
                )}
                {response.intent.max_price && (
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Max Price:</span>
                    <span className="text-on-surface font-semibold">₹{response.intent.max_price.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {response.intent.requirements && response.intent.requirements.length > 0 && (
                  <div className="flex flex-col gap-1 text-on-surface-variant mt-0.5">
                    <span>Requirements:</span>
                    <div className="flex flex-wrap gap-1">
                      {response.intent.requirements.map((req) => (
                        <span key={req} className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px]">
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Commerce Policy Constraints */}
          <div className="bg-surface-container/30 border border-white/5 rounded-xl p-3 flex flex-col gap-1.5 text-xs font-mono shrink-0">
            <div className="flex items-center gap-1.5 text-on-surface-variant/60 uppercase tracking-wider text-[10px] pb-1 border-b border-white/5">
              <MaterialIcon icon="verified_user" size={13} className="text-primary/70" />
              <span>Policy Controls</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Budget Limit</span>
              <span className="text-on-surface tabular-nums font-semibold">{policy?.maxPurchaseFormatted ?? "₹70,000"}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Approval Threshold</span>
              <span className="text-on-surface tabular-nums font-semibold">{policy?.approvalAboveFormatted ?? "₹25,000"}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Autonomous Max Discount</span>
              <span className="text-on-surface tabular-nums font-semibold">{policy?.maxDiscountPercent ?? 15}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recommended Product & Alternatives OR Quick Showcase */}
        <div className="md:col-span-8 h-full flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
          {/* Rich Exploration Matrix (shown only if no conversation is active) */}
          {!hasConversation && (
            <div className="flex flex-col gap-3 p-4 border border-white/10 rounded-xl bg-surface-container/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
                  <MaterialIcon icon="explore" size={20} />
                </div>
                <div>
                  <h3 className="text-body-lg font-bold text-white leading-none">Autonomous Shopping Assistant</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Select an AI search recipe or ask for any product within catalog guidelines.
                  </p>
                </div>
              </div>

              {/* 4 Interactive Category Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                <div
                  onClick={() => executeSearch("Find me a laptop for coding and gaming under ₹70,000.")}
                  className="group p-3 rounded-lg bg-surface-container/60 border border-white/5 hover:border-primary/40 hover:bg-surface-container-high transition-all cursor-pointer flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MaterialIcon icon="laptop" size={18} className="text-primary" />
                      <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                        Coding & Gaming Laptop
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      ≤ ₹70,000
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    Dedicated RTX GPU, 16GB RAM, fast thermals for compiler workloads and gaming.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-primary pt-1 border-t border-white/5">
                    <span>Top Match: HP Victus 15</span>
                    <MaterialIcon icon="arrow_forward" size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => executeSearch("Best camera phone under ₹80,000")}
                  className="group p-3 rounded-lg bg-surface-container/60 border border-white/5 hover:border-secondary/40 hover:bg-surface-container-high transition-all cursor-pointer flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MaterialIcon icon="photo_camera" size={18} className="text-secondary" />
                      <span className="text-xs font-bold text-white group-hover:text-secondary transition-colors">
                        Flagship Camera Phone
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/10 text-secondary">
                      ≤ ₹80,000
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    Optical zoom, OIS stabilization, periscope sensor, and multi-lens camera system.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-secondary pt-1 border-t border-white/5">
                    <span>Top Match: Redmi Note 13 Pro+</span>
                    <MaterialIcon icon="arrow_forward" size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => executeSearch("Best noise cancelling headphones under ₹15,000")}
                  className="group p-3 rounded-lg bg-surface-container/60 border border-white/5 hover:border-tertiary/40 hover:bg-surface-container-high transition-all cursor-pointer flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MaterialIcon icon="headphones" size={18} className="text-tertiary" />
                      <span className="text-xs font-bold text-white group-hover:text-tertiary transition-colors">
                        Active Noise Cancelling
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary">
                      ≤ ₹15,000
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    Studio sound quality, multi-device pairing, 30+ hour battery life.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-tertiary pt-1 border-t border-white/5">
                    <span>Instant Autonomous Auth</span>
                    <MaterialIcon icon="arrow_forward" size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div
                  onClick={() => executeSearch("Best value high performance electronics under ₹50,000")}
                  className="group p-3 rounded-lg bg-surface-container/60 border border-white/5 hover:border-primary/40 hover:bg-surface-container-high transition-all cursor-pointer flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MaterialIcon icon="price_check" size={18} className="text-primary" />
                      <span className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                        Best Value Optimizer
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Max Discount
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">
                    Auto-scans 200 catalog items, applies policy ceilings, and secures discounts.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-primary pt-1 border-t border-white/5">
                    <span>15% Max Policy Ceiling</span>
                    <MaterialIcon icon="arrow_forward" size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Skeleton while searching */}
          {isLoading && !response && !error && (
            <div className="flex flex-col gap-3">
              <div className="border border-white/10 rounded-xl overflow-hidden animate-pulse bg-surface-container">
                <div className="w-full h-40 bg-surface-container-highest" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-6 bg-surface-container-highest rounded w-2/3" />
                  <div className="h-4 bg-surface-container-highest rounded w-1/3" />
                  <div className="h-12 bg-surface-container-highest rounded mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-xl bg-error-container/10 border border-error/30 text-error flex items-start gap-2">
              <MaterialIcon icon="error" size={18} className="shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-xs">Search Error</span>
                <span className="text-xs text-error/90">{error}</span>
              </div>
            </div>
          )}

          {/* Primary Recommendation Card */}
          {!error && recommendedProduct && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-label-caps text-on-surface-variant flex items-center gap-1.5 font-semibold text-xs">
                  <MaterialIcon icon="recommend" size={15} className="text-primary" />
                  Top Recommendation
                </h3>
                {isFromCache && (
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <MaterialIcon icon="flash_on" size={13} />
                    Instant Result
                  </span>
                )}
              </div>

              <div className="border border-white/10 rounded-xl overflow-hidden relative bg-surface-container/40 shadow-xl transition-all hover:border-white/20">
                <div className="absolute top-3 right-3 z-10">
                  <StatusBadge label={`${recommendedProduct.matchPercent}% Match`} color="blue" />
                </div>

                <div className="w-full h-40 sm:h-44 bg-surface-container-high relative overflow-hidden flex items-center justify-center">
                  {recommendedProduct.heroImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={recommendedProduct.heroImage}
                      alt={recommendedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full items-center justify-center ${
                      recommendedProduct.heroImage ? "hidden" : "flex"
                    }`}
                  >
                    <MaterialIcon
                      icon={
                        response?.intent?.category === "smartphone"
                          ? "smartphone"
                          : response?.intent?.category === "audio"
                          ? "headphones"
                          : "laptop"
                      }
                      size={56}
                      className="text-primary/30"
                    />
                  </div>
                </div>

                <div className="p-3.5 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <h2 className="text-headline-md font-bold text-white leading-tight">
                      {recommendedProduct.name}
                    </h2>
                    <MoneyValue size="md" className="text-white whitespace-nowrap font-bold">
                      {recommendedProduct.priceFormatted}
                    </MoneyValue>
                  </div>

                  <p className="text-xs text-on-surface-variant line-clamp-2">{recommendedProduct.specs}</p>

                  {/* Why this matches */}
                  <div className="border-l-2 border-primary-container/60 pl-2.5 py-1 bg-primary-container/5 rounded-r-lg">
                    <h4 className="text-[11px] text-primary mb-1 font-semibold uppercase tracking-wider">Why this matches</h4>
                    {response?.match_reasons && response.match_reasons.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {response.match_reasons.slice(0, 3).map((reason) => (
                          <div key={reason} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                            <MaterialIcon icon="check" className="text-primary shrink-0 mt-0.5" size={13} />
                            <span className="line-clamp-1">{reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-on-surface-variant">No specific reasons provided by agent.</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 w-full">
                    <Link
                      href={
                        recommendedProduct.matchPercent > 0
                          ? `/products/${recommendedProduct.id}?match=${recommendedProduct.matchPercent}`
                          : `/products/${recommendedProduct.id}`
                      }
                      className="btn-primary flex-1 h-10 inline-flex items-center justify-center py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold text-center shadow-md transition-all hover:scale-[1.01] leading-none"
                    >
                      View Recommendation
                    </Link>
                    <CompareAlternatives
                      products={response?.products || []}
                      triggerText={`Compare ${response?.products?.length || 0} options`}
                      triggerClassName="btn-secondary flex-1 h-10 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold text-center hover:bg-surface-container-high transition-all cursor-pointer leading-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alternative Options */}
          {!error && (response ? displayAlternatives.length > 0 : false) && (
            <div className="flex flex-col gap-2">
              <h3 className="text-label-caps text-on-surface-variant font-semibold text-xs">Alternative Options</h3>
              <div className="flex flex-col divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-surface-container/30">
                {displayAlternatives.map(
                  (
                    alt: {
                      matchColor?: string;
                      dotColor?: string;
                      matchPercent?: number;
                      price?: string;
                      name?: string;
                      description?: string;
                    },
                    idx: number
                  ) => (
                    <div
                      key={idx}
                      className="flex flex-col p-2.5 hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-0.5 w-full">
                        <span className={`text-[10px] ${alt.matchColor || "text-primary"} flex items-center gap-1 font-medium uppercase tracking-wider`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${alt.dotColor || "bg-primary"}`} />
                          {alt.matchPercent || 85}% Match
                        </span>
                        <MoneyValue size="sm">{alt.price}</MoneyValue>
                      </div>
                      <h4 className="text-xs font-medium text-on-surface mb-0.5 truncate" title={alt.name}>
                        {alt.name}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1" title={alt.description}>
                        {alt.description}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
