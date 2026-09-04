"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import MaterialIcon from "@/components/MaterialIcon";
import CompareAlternatives from "@/components/CompareAlternatives";
import MoneyValue from "@/components/MoneyValue";
import StatusBadge from "@/components/StatusBadge";
import { getBuyerData, getCommercePolicy, chatWithAgent, AgentChatResponse, CommercePolicy } from "@/lib/api";

export default function BuyerPage() {
  const [query, setQuery] = useState("Find me a laptop for coding and gaming under ₹70,000.");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AgentChatResponse | null>(null);
  const [sessionId] = useState<string | null>(null);
  const [buyerData, setBuyerData] = useState<{
    matchReasons: string[];
    suggestions: string[];
    alternatives: { matchColor?: string; dotColor?: string; matchPercent?: number; price?: string; name?: string; description?: string }[];
  }>({ matchReasons: [], suggestions: [], alternatives: [] });
  const [policy, setPolicy] = useState<CommercePolicy | null>(null);

  const [loadingSteps, setLoadingSteps] = useState([
    { label: "Understanding request", done: false },
    { label: "Searching catalog", done: false },
    { label: "Comparing products", done: false },
    { label: "Selecting best match", done: false },
  ]);

  useEffect(() => {
    // Load initial static data for the page
    Promise.all([
      getBuyerData(),
      getCommercePolicy()
    ]).then(([bData, policyData]) => {
      setBuyerData(bData);
      setPolicy(policyData);
    }).catch(err => console.error("Failed to load initial data", err));
  }, []);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    // Reset steps
    setLoadingSteps([
      { label: "Understanding request", done: false },
      { label: "Searching catalog", done: false },
      { label: "Comparing products", done: false },
      { label: "Selecting best match", done: false },
    ]);

    // Simulate progress while waiting for the real backend
    const progressInterval = setInterval(() => {
      setLoadingSteps(prev => {
        const next = [...prev];
        const firstUndone = next.findIndex(s => !s.done);
        if (firstUndone !== -1 && firstUndone < next.length - 1) {
          next[firstUndone].done = true;
        }
        return next;
      });
    }, 1500);

    try {
      const res = await chatWithAgent(query, sessionId || undefined);
      setResponse(res);
      // All steps done
      setLoadingSteps(prev => prev.map(s => ({ ...s, done: true })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasConversation = isLoading || !!response || !!error;

  const recommendedProduct = response?.products.find(p => p.id === response.recommended_product_id);

  // Filter alternatives to exclude the recommended product, and fallback if necessary
  const displayAlternatives = response?.products
    .filter(p => p.id !== response.recommended_product_id)
    .map(p => ({
      name: p.name,
      price: p.priceFormatted,
      matchPercent: p.matchPercent || 85,
      description: p.specs || p.description,
      matchColor: "text-primary",
      dotColor: "bg-primary"
    })) || buyerData.alternatives;

  return (
    <main className="flex-grow px-md md:px-lg w-full flex flex-col md:h-[calc(100vh-8rem)] md:overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 md:gap-lg md:h-full">
        {/* Left column — chat / agent. Fixed input at the bottom, scrolling feed above it. */}
        <div className="md:col-span-4 flex flex-col md:h-full md:min-h-0 py-md md:py-lg md:pr-lg md:border-r md:border-white/5">
          <div className="flex-1 md:min-h-0 md:overflow-y-auto flex flex-col gap-lg pr-xs">
            {!hasConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-md py-xl">
                <MaterialIcon icon="auto_awesome" className="text-primary opacity-60" size={28} />
                <p className="text-body-md text-on-surface-variant max-w-[280px]">
                  Ask your agent to find something, or try one of these:
                </p>
                <div className="flex flex-wrap justify-center gap-sm">
                  {Array.isArray(buyerData.suggestions) && buyerData.suggestions.map((s: string) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="border border-white/10 px-md py-xs rounded-full text-label-caps text-on-surface-variant hover:text-white hover:border-white/20 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* User message */}
                <div className="flex gap-sm">
                  <span className="text-xs text-on-surface-variant/50 shrink-0 w-9 pt-0.5">You</span>
                  <p className="text-body-md text-on-surface-variant flex-1">{query}</p>
                </div>

                {/* Agent entry */}
                <div className="flex gap-sm">
                  <MaterialIcon
                    icon={error ? "error" : "auto_awesome"}
                    className={`shrink-0 pt-0.5 ${error ? "text-error" : "text-primary"}`}
                    size={18}
                  />
                  <div className="flex-1 flex flex-col gap-sm min-w-0">
                    {error ? (
                      <p className="text-body-md text-error">{error}</p>
                    ) : (
                      <>
                        <ul className="flex flex-col gap-sm text-body-md">
                          {loadingSteps.map((step, idx) => {
                            const delay = (idx + 1) * 100;
                            const delayClass = delay <= 500 ? `delay-${delay}` : "delay-500";
                            return (
                              <li
                                key={step.label}
                                className={`flex items-center gap-sm animate-fade-in-up ${delayClass} ${
                                  isLoading && !step.done ? "text-primary" : "text-on-surface-variant"
                                }`}
                              >
                                {step.done || !isLoading ? (
                                  <MaterialIcon icon="check" size={16} className="text-primary" />
                                ) : (
                                  <MaterialIcon icon="progress_activity" size={16} className="animate-spin-slow" />
                                )}
                                {step.label}
                              </li>
                            );
                          })}
                        </ul>

                        {response && (
                          <p className="text-body-md text-on-background whitespace-pre-wrap animate-fade-in delay-200">
                            {response.message}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chat input — pinned to the bottom of the column */}
          <div className="shrink-0 pt-md">
            <div
              className={`border border-white/10 rounded-lg p-xs flex items-end transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:border-primary-container/50 ${
                isLoading ? "opacity-70 pointer-events-none" : ""
              }`}
            >
              <textarea
                className="w-full bg-transparent border-none text-body-md text-on-background focus:ring-0 focus:outline-none resize-none p-sm min-h-[64px]"
                placeholder="Ask your agent to find something..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <div className="flex items-center gap-xs pb-xs pr-xs shrink-0">
                <button className="text-on-surface-variant hover:text-white transition-colors p-xs">
                  <MaterialIcon icon="attach_file" size={18} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !query.trim()}
                  className="bg-primary-container rounded-md p-xs flex items-center justify-center disabled:opacity-40 transition-opacity"
                >
                  <MaterialIcon icon="arrow_upward" fill className="text-white" size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — editorial recommendation view. Scrolls independently of the chat. */}
        <div className="md:col-span-8 flex flex-col gap-lg md:h-full md:min-h-0 md:overflow-y-auto py-md md:py-lg md:pl-lg">
          {!hasConversation && (
            <div className="flex-1 flex flex-col items-center justify-center py-xl">
              <div className="flex flex-col gap-lg font-mono min-w-[280px]">
                <div className="flex items-center gap-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse-dot shrink-0" />
                  <span className="text-xs tracking-widest text-on-surface-variant/50">
                    {"// SYSTEM READY : WAITING FOR INPUT"}
                  </span>
                </div>
                <div className="flex flex-col gap-sm text-xs">
                  <div className="flex justify-between gap-lg">
                    <span className="text-on-surface-variant/40">ACTIVE_BUDGET_LIMIT</span>
                    <span className="text-on-surface-variant/70 tabular-nums">
                      {policy?.maxPurchaseFormatted ?? "₹70,000"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-lg">
                    <span className="text-on-surface-variant/40">APPROVAL_THRESHOLD</span>
                    <span className="text-on-surface-variant/70 tabular-nums">
                      {policy?.approvalAboveFormatted ?? "₹25,000"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-lg">
                    <span className="text-on-surface-variant/40">CATALOG_CONNECTION</span>
                    <span className="text-secondary/70">SECURE</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation */}
          {!error && recommendedProduct && (
            <div className="flex flex-col gap-md">
              <h3 className="text-label-caps text-on-surface-variant">Recommendation</h3>
              <div className="border border-white/5 rounded-lg overflow-hidden relative animate-fade-in-up delay-200">
                <div className="absolute top-md right-md z-10 animate-fade-in delay-500">
                  <StatusBadge label={`${recommendedProduct.matchPercent}% Match`} color="blue" />
                </div>

                <div className="w-full h-56 bg-surface-container-high relative">
                  {recommendedProduct.heroImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={recommendedProduct.heroImage}
                      alt={recommendedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MaterialIcon icon="laptop" size={64} className="text-on-surface-variant opacity-20" />
                    </div>
                  )}
                </div>

                <div className="p-lg flex flex-col">
                  <div className="flex justify-between items-start mb-sm gap-md">
                    <h2 className="text-headline-lg text-white">{recommendedProduct.name}</h2>
                    <MoneyValue size="md" className="text-white whitespace-nowrap">
                      {recommendedProduct.priceFormatted}
                    </MoneyValue>
                  </div>
                  <p className="text-body-md text-on-surface-variant mb-md">{recommendedProduct.specs}</p>

                  {/* Why this matches — an annotation, not a card */}
                  <div className="border-l-2 border-primary-container/50 pl-md py-xs mb-lg">
                    <h4 className="text-label-caps text-primary mb-sm">Why this matches</h4>
                    {response?.match_reasons && response.match_reasons.length > 0 ? (
                      <div className="flex flex-col gap-xs">
                        {response.match_reasons.map((reason) => (
                          <div key={reason} className="flex items-start gap-xs text-body-md text-on-surface-variant">
                            <MaterialIcon icon="check" className="text-primary shrink-0 mt-0.5" size={14} />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-body-md text-on-surface-variant">No specific reasons provided by agent.</p>
                    )}
                  </div>

                  <div className="flex gap-md">
                    <Link
                      href={
                        recommendedProduct.matchPercent > 0
                          ? `/products/${recommendedProduct.id}?match=${recommendedProduct.matchPercent}`
                          : `/products/${recommendedProduct.id}`
                      }
                      className="btn-primary flex-1 py-sm rounded-lg text-body-md font-medium text-center"
                    >
                      View recommendation
                    </Link>
                    <CompareAlternatives
                      products={response?.products || []}
                      triggerText={`Compare ${response?.products?.length || 0} options`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Skeleton while the agent is still working */}
          {isLoading && !response && !error && (
            <div className="flex flex-col gap-md">
              <h3 className="text-label-caps text-on-surface-variant">Recommendation</h3>
              <div className="border border-white/5 rounded-lg overflow-hidden animate-pulse">
                <div className="w-full h-56 bg-surface-container-highest" />
                <div className="p-lg flex flex-col gap-sm">
                  <div className="h-8 bg-surface-container-highest rounded w-3/4" />
                  <div className="h-6 bg-surface-container-highest rounded w-1/4" />
                  <div className="h-24 bg-surface-container-highest rounded mt-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Alternatives */}
          {!error && (response ? displayAlternatives.length > 0 : false) && (
            <div className="flex flex-col gap-md">
              <h3 className="text-label-caps text-on-surface-variant">Alternative Options</h3>
              <div className="flex flex-col divide-y divide-white/5 border border-white/5 rounded-lg overflow-hidden">
                {displayAlternatives.map((alt: { matchColor?: string, dotColor?: string, matchPercent?: number, price?: string, name?: string, description?: string }, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col p-md hover:bg-white/[0.02] transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  >
                    <div className="flex justify-between items-start mb-xs w-full">
                      <span className={`text-label-caps ${alt.matchColor || "text-primary"} flex items-center gap-xs`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${alt.dotColor || "bg-primary"}`} />
                        {alt.matchPercent || 85}% Match
                      </span>
                      <MoneyValue size="sm">{alt.price}</MoneyValue>
                    </div>
                    <h4 className="text-body-lg font-medium text-on-surface mb-xs truncate" title={alt.name}>
                      {alt.name}
                    </h4>
                    <p className="text-body-md text-on-surface-variant text-xs line-clamp-2" title={alt.description}>
                      {alt.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
