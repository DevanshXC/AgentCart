"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import Footer from "@/components/Footer";
import MaterialIcon from "@/components/MaterialIcon";
import CompareAlternatives from "@/components/CompareAlternatives";
import { getBuyerData, chatWithAgent, AgentChatResponse } from "@/lib/api";

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

  const [loadingSteps, setLoadingSteps] = useState([
    { label: "Understanding request", done: false },
    { label: "Searching catalog", done: false },
    { label: "Comparing products", done: false },
    { label: "Selecting best match", done: false },
  ]);

  useEffect(() => {
    // Load initial static data for the page
    Promise.all([
      getBuyerData()
    ]).then(([bData]) => {
      setBuyerData(bData);
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
    <>
      <main className="flex-grow pt-lg px-md md:px-xl max-w-[1280px] mx-auto w-full flex flex-col">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mb-lg w-full max-w-3xl mx-auto">
          <h1 className="text-display font-semibold mb-sm">
            What would you like to buy?
          </h1>
          <p className="text-body-lg text-on-surface-variant mb-lg max-w-2xl">
            Your AI agent searches, compares, and prepares the best purchase
            within the limits you set.
          </p>

          {/* Conversational Input */}
          <div className="w-full relative mb-md">
            <div className={`glass-panel rounded-xl p-xs flex items-end transition-all duration-300 focus-within:border-primary-container focus-within:shadow-[0_0_0_2px_rgba(0,82,255,0.2)] ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}>
              <textarea
                className="w-full bg-transparent border-none text-body-lg text-on-background focus:ring-0 focus:outline-none resize-none p-md pb-xs min-h-[100px]"
                placeholder="Ask your agent to find something..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <div className="flex justify-between items-center w-full absolute bottom-sm left-0 px-md">
                <button className="text-on-surface-variant hover:text-white transition-colors p-sm">
                  <MaterialIcon icon="attach_file" />
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isLoading || !query.trim()}
                  className="btn-primary rounded-lg p-sm flex items-center justify-center disabled:opacity-50"
                >
                  <MaterialIcon icon="arrow_upward" fill className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Suggestion Chips */}
          <div className="flex flex-wrap justify-center gap-sm mt-sm">
            {Array.isArray(buyerData.suggestions) && buyerData.suggestions.map((s: string) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  // Don't auto-submit to let user review
                }}
                className="glass-panel px-md py-xs rounded-full text-label-caps text-on-surface-variant hover:text-white hover:bg-surface-container-high transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Agent Response Workspace */}
        {(isLoading || response || error) && (
          <section className="w-full mt-lg grid grid-cols-1 lg:grid-cols-12 gap-lg mx-auto items-start">
            {/* Process & Chat Column */}
            <div className="col-span-1 lg:col-span-3 flex flex-col gap-md">
              <h3 className="text-label-caps text-on-surface-variant h-[24px] flex items-end">
                Conversation
              </h3>
              {/* User Message */}
              <div className="glass-panel rounded-xl p-md flex flex-col">
                <span className="text-label-caps text-on-surface-variant mb-xs self-start">
                  You
                </span>
                <p className="text-body-md text-on-background w-full">
                  {query}
                </p>
              </div>

              {/* Agent Status */}
              <div className="glass-panel rounded-xl p-md flex flex-col">
                <div className="flex items-center gap-sm mb-md">
                  <MaterialIcon
                    icon={error ? "error" : "smart_toy"}
                    fill
                    className={error ? "text-error" : "text-primary-container"}
                  />
                  <h3 className="text-headline-md text-on-background">
                    {error ? "Agent Error" : isLoading ? "Agent working..." : "Agent response"}
                  </h3>
                </div>
                
                {error ? (
                  <p className="text-body-md text-error">{error}</p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-sm text-body-md">
                      {loadingSteps.map((step, idx) => {
                        const delay = (idx + 1) * 100;
                        const delayClass = delay <= 500 ? `delay-${delay}` : 'delay-500';
                        return (
                        <li
                          key={step.label}
                          className={`flex items-center gap-sm animate-fade-in-up ${delayClass} ${
                            step.done ? "text-secondary" : isLoading ? "text-primary" : "text-secondary"
                          }`}
                        >
                          {step.done || !isLoading ? (
                            <MaterialIcon icon="check_circle" fill size={18} />
                          ) : (
                            <MaterialIcon
                              icon="progress_activity"
                              size={18}
                              className="animate-spin-slow"
                            />
                          )}
                          {step.label}
                        </li>
                      )})}
                    </ul>
                    
                    {response && (
                      <div className="mt-md pt-md animate-fade-in delay-200">
                        <p className="text-body-md text-on-background whitespace-pre-wrap">
                          {response.message}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Primary Recommendation Column */}
            {!error && recommendedProduct && (
              <div className="col-span-1 lg:col-span-5 flex flex-col gap-md">
                <h3 className="text-label-caps text-on-surface-variant h-[24px] flex items-end">
                  Recommendation
                </h3>
                <div className="glass-panel rounded-xl p-0 flex flex-col overflow-hidden relative animate-fade-in-up delay-200">
                  {/* Match Badge */}
                  <div className="absolute top-md right-md z-10 bg-surface-container-lowest border border-outline-variant px-sm py-xs rounded-full flex items-center gap-xs animate-fade-in delay-500">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-label-caps text-secondary">
                      {recommendedProduct.matchPercent}% Match
                    </span>
                  </div>

                  {/* Image */}
                  <div className="w-full h-48 bg-surface-container-high relative">
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

                  {/* Content */}
                  <div className="p-md flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-sm">
                      <h2 className="text-headline-lg text-white">
                        {recommendedProduct.name}
                      </h2>
                      <span className="text-headline-md font-semibold text-white">
                        {recommendedProduct.priceFormatted}
                      </span>
                    </div>
                    <p className="text-body-md text-on-surface-variant mb-md">
                      {recommendedProduct.specs}
                    </p>

                    {/* Why this matches */}
                    <div className="mt-auto bg-surface-container-low rounded-lg p-md">
                      <h4 className="text-label-caps text-on-surface-variant mb-sm">
                        Why this matches
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                        {response?.match_reasons && response.match_reasons.length > 0 ? (
                          response.match_reasons.map((reason, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-xs text-body-md"
                            >
                              <MaterialIcon
                                icon="check"
                                fill
                                className="text-secondary"
                                size={16}
                              />
                              <span className="truncate" title={reason}>{reason}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-xs text-body-md col-span-2 text-on-surface-variant">
                            No specific reasons provided by agent.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-md mt-lg">
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
            
            {/* Show skeleton loader for recommendation if loading */}
            {isLoading && !response && !error && (
               <div className="col-span-1 lg:col-span-5 flex flex-col gap-md">
                 <h3 className="text-label-caps text-on-surface-variant h-[24px] flex items-end">
                   Recommendation
                 </h3>
                 <div className="glass-panel rounded-xl p-0 flex flex-col overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-surface-container-highest"></div>
                    <div className="p-lg flex flex-col flex-grow">
                      <div className="h-8 bg-surface-container-highest rounded w-3/4 mb-sm"></div>
                      <div className="h-6 bg-surface-container-highest rounded w-1/4 mb-md"></div>
                      <div className="mt-auto h-32 bg-surface-container-highest rounded"></div>
                    </div>
                 </div>
               </div>
            )}

            {/* Alternatives Column */}
            {!error && (response ? displayAlternatives.length > 0 : true) && (
              <div className="col-span-1 lg:col-span-4 flex flex-col gap-md">
                <h3 className="text-label-caps text-on-surface-variant h-[24px] flex items-end">
                  Alternative Options
                </h3>
                {isLoading && !response ? (
                  <>
                    <div className="glass-panel rounded-xl p-md h-32 animate-pulse"></div>
                    <div className="glass-panel rounded-xl p-md h-32 animate-pulse"></div>
                  </>
                ) : (
                  displayAlternatives.map((alt: { matchColor?: string, dotColor?: string, matchPercent?: number, price?: string, name?: string, description?: string }, idx: number) => {
                    const delay = (idx + 3) * 100;
                    const delayClass = delay <= 500 ? `delay-${delay}` : 'delay-500';
                    return (
                    <div
                      key={idx}
                      className={`glass-panel rounded-xl p-md flex flex-col card-hover animate-fade-in-up ${delayClass}`}
                    >
                      <div className="flex justify-between items-start mb-xs">
                        <span
                          className={`text-label-caps ${alt.matchColor || "text-primary"} flex items-center gap-xs`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${alt.dotColor || "bg-primary"}`}
                          />
                          {alt.matchPercent || 85}% Match
                        </span>
                        <span className="text-body-md font-semibold">{alt.price}</span>
                      </div>
                      <h4 className="text-headline-md text-white mb-xs truncate" title={alt.name}>
                        {alt.name}
                      </h4>
                      <p className="text-body-md text-on-surface-variant text-xs line-clamp-2" title={alt.description}>
                        {alt.description}
                      </p>
                    </div>
                  )})
                )}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
