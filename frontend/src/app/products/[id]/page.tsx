import Link from "next/link";

import MaterialIcon from "@/components/MaterialIcon";
import CompareAlternatives from "@/components/CompareAlternatives";
import AccessoriesPanel from "@/components/AccessoriesPanel";
import ProductImage from "@/components/ProductImage";
import { getProduct, getProducts, getAccessories, getCommercePolicy, getProductPageData } from "@/lib/api";

function parseMatchPercent(raw: string | string[] | undefined): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return undefined;
  return parsed;
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { match } = await searchParams;
  const matchPercent = parseMatchPercent(match);

  const product = await getProduct(id);
  const allProducts = await getProducts();
  const accessories = await getAccessories();
  const policy = await getCommercePolicy();
  const { matchReasons, requirementMatching } = await getProductPageData();

  return (
    <main className="flex-grow px-md md:px-lg w-full flex flex-col md:h-[calc(100vh-8rem)] md:overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 md:gap-xl md:h-full py-md md:py-lg">
        {/* Left column — visuals only. Pure product, no card, no border. */}
        <div className="flex flex-col items-center justify-center md:h-full md:min-h-0 py-md md:py-0">
          <ProductImage
            src={product.image}
            alt={product.name}
            className="w-full h-64 md:h-full md:max-h-[70vh] group"
          />
        </div>

        {/* Right column — data & action */}
        <div className="flex flex-col md:h-full md:min-h-0 relative md:pl-xl md:border-l md:border-white/5">
          <div className="flex-1 md:min-h-0 md:overflow-y-auto flex flex-col gap-lg pr-xs">
            {/* Identity */}
            <div>
              <div className="flex items-center gap-md mb-sm">
                <span className="flex items-center gap-xs text-label-caps text-primary tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  Agent Verified
                </span>
                {matchPercent !== undefined && (
                  <span className="text-label-caps text-on-surface-variant">{matchPercent}% match</span>
                )}
              </div>
              <h1 className="text-4xl font-light text-on-background mb-sm">{product.name}</h1>
              <div className="font-mono text-3xl tabular-nums text-white mb-sm">{product.priceFormatted}</div>
              <p className="text-body-md text-on-surface-variant">{product.specs}</p>
            </div>

            {/* Why your agent chose this — annotation, not a card */}
            <div className="border-l border-primary-container/50 pl-md py-xs">
              <h4 className="text-label-caps text-primary tracking-widest mb-sm">Why your agent chose this</h4>
              <div className="flex flex-col gap-xs">
                {matchReasons.map((reason: string) => (
                  <div key={reason} className="flex items-start gap-xs text-body-md text-on-surface-variant">
                    <MaterialIcon icon="check" className="text-primary shrink-0 mt-0.5" size={14} />
                    <span>
                      {reason
                        .replace("(₹70k)", "(₹70,000)")
                        .replace("for Coding", "for coding")
                        .replace("for Gaming", "for gaming")
                        .replace("Fast SSD", "SSD")}
                    </span>
                  </div>
                ))}
              </div>
              <CompareAlternatives
                products={allProducts}
                triggerText="Compare alternatives"
                triggerClassName="mt-md text-sm text-on-surface-variant hover:text-white transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] underline underline-offset-4 decoration-white/20"
              />
            </div>

            {/* Requirement Matching — data matrix */}
            <div>
              <h4 className="text-label-caps text-on-surface-variant tracking-widest mb-sm">
                Requirement Matching
              </h4>
              <div className="flex flex-col divide-y divide-white/5 font-mono text-sm">
                {requirementMatching.map((req: { label: string; value: string; valueColor: string }) => (
                  <div key={req.label} className="flex justify-between items-center py-xs">
                    <span className="text-on-surface-variant">{req.label}</span>
                    <span className={`text-right tabular-nums ${req.valueColor}`}>{req.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial guardrails — compact ledger strip */}
            <div className="flex flex-col gap-xs font-mono text-xs pt-sm border-t border-white/5">
              <div className="flex justify-between">
                <span className="text-on-surface-variant/40">MAX_PURCHASE</span>
                <span className="text-on-surface-variant/70 tabular-nums">{policy.maxPurchaseFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant/40">REMAINING_BUDGET</span>
                <span className="text-secondary/80 tabular-nums">{policy.remainingBudgetFormatted}</span>
              </div>
            </div>

            {/* Complete your setup */}
            <div>
              <h4 className="text-label-caps text-on-surface-variant tracking-widest mb-sm">
                Complete your setup
              </h4>
              <AccessoriesPanel accessories={accessories} />
            </div>
          </div>

          {/* Pinned CTA — never scrolls out of view */}
          <div className="shrink-0 md:sticky md:bottom-0 bg-[var(--color-background)] pt-md">
            <Link
              href="/authorize"
              className="w-full h-12 flex items-center justify-center gap-sm rounded-md bg-primary-container text-white font-medium active:scale-[0.98] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background"
            >
              <MaterialIcon icon="shopping_cart" size={18} />
              Add to purchase
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
