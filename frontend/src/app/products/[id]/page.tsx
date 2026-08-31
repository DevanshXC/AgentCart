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
    <>

      <main className="flex-grow pt-lg pb-xl px-md md:px-xl max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-lg lg:items-start">
        {/* Left: Product Image & AI Explanation */}
        <div className="lg:col-span-7 flex flex-col gap-lg">
          {/* Product Image Hero */}
          <ProductImage
            src={product.image}
            alt={product.name}
            className="glass-panel rounded-xl group min-h-[320px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none" />
            <div className="absolute top-md left-md z-20 flex items-center gap-xs bg-surface-container/80 backdrop-blur-md border border-outline-variant rounded-full px-3 py-1">
              <MaterialIcon
                icon="check_circle"
                fill
                className="text-secondary"
                size={16}
              />
              <span className="text-label-caps text-on-surface">
                Agent Verified
              </span>
            </div>
          </ProductImage>

          {/* AI Explanation Panel */}
          <div className="glass-panel rounded-xl p-lg">
            <div className="flex items-center gap-sm mb-md">
              <MaterialIcon icon="auto_awesome" className="text-primary" />
              <h3 className="text-headline-md text-on-background">
                Why your agent chose this
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {matchReasons.map((reason: string) => (
                <div key={reason} className="flex items-start gap-sm">
                  <MaterialIcon icon="check" className="text-secondary" size={20} />
                  <span className="text-body-md text-on-surface-variant">
                    {reason.replace("(₹70k)", "(₹70,000)").replace("for Coding", "for coding").replace("for Gaming", "for gaming").replace("Fast SSD", "SSD").replace("Currently in stock", "Currently in stock")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Details & Actions */}
        <div className="lg:col-span-5 flex flex-col gap-lg">
          {/* Product Identity & Price */}
          <div className="glass-panel rounded-xl p-lg flex flex-col">
            <div className="flex justify-between items-start mb-sm">
              <span className="text-label-caps text-primary tracking-widest">
                AI Recommendation
              </span>
              {matchPercent !== undefined && (
                <div className="flex items-center gap-xs bg-secondary/10 text-secondary px-2 py-1 rounded-sm border border-secondary/20">
                  <span className="text-label-caps font-bold">
                    {matchPercent}% MATCH
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-headline-lg text-on-background mb-sm">
              {product.name}
            </h1>
            <div className="text-display text-on-background mb-md">
              {product.priceFormatted}
            </div>
            <p className="text-body-lg text-on-surface-variant mb-lg">
              {product.specs}
            </p>
            <div className="flex items-center gap-md mb-xl">
              <div className="flex items-center gap-xs">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-body-md text-on-surface">In Stock</span>
              </div>
              <span className="text-outline-variant">|</span>
              <span className="text-body-md text-on-surface-variant">
                Delivery in {product.delivery}
              </span>
            </div>
            <div className="flex flex-col gap-md mt-auto">
              <Link
                href="/authorize"
                className="btn-primary w-full py-3 rounded-lg text-body-md font-semibold flex items-center justify-center gap-sm"
              >
                <MaterialIcon icon="shopping_cart" />
                Add to purchase
              </Link>
              <CompareAlternatives
                products={allProducts}
                triggerText="Compare alternatives"
                triggerClassName="btn-secondary w-full py-3 rounded-lg text-body-md font-semibold flex items-center justify-center gap-sm hover:bg-surface-container-high transition-colors flex"
              />
            </div>
          </div>

          {/* Requirement Matching */}
          <div className="glass-panel rounded-xl p-lg">
            <h4 className="text-label-caps text-on-surface-variant tracking-widest mb-md">
              Requirement Matching
            </h4>
            <div className="flex flex-col gap-md">
              {requirementMatching.map((req: { label: string; value: string; valueColor: string; icon?: string }) => (
                <div
                  key={req.label}
                  className="flex justify-between items-center"
                >
                  <span className="text-body-md text-on-surface">
                    {req.label}
                  </span>
                  <div className={`flex items-center gap-xs ${req.valueColor}`}>
                    <span className="text-body-md">{req.value}</span>
                    {req.icon && (
                      <MaterialIcon icon={req.icon} size={16} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Your Setup */}
          <div className="glass-panel rounded-xl p-lg">
            <h4 className="text-label-caps text-on-surface-variant tracking-widest mb-md">
              Complete your setup
            </h4>
            <AccessoriesPanel accessories={accessories} />
          </div>
        </div>
      </main>

      {/* Agent Limits Footer */}
      <div className="w-full bg-surface-container-lowest py-md px-lg relative z-40 mt-auto">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-md">
          <div className="flex flex-col gap-xs flex-grow">
            <div className="flex items-center gap-sm text-primary mb-1">
              <MaterialIcon icon="security" size={18} />
              <span className="text-label-caps tracking-widest font-bold">
                Agent Financial Limits
              </span>
            </div>
            <div className="flex flex-wrap gap-x-lg gap-y-sm text-body-md text-on-surface-variant">
              <div>
                Maximum purchase:{" "}
                <span className="text-on-surface font-medium">
                  {policy.maxPurchaseFormatted}
                </span>
              </div>
              <div>
                Current product:{" "}
                <span className="text-on-surface font-medium">
                  {product.priceFormatted}
                </span>
              </div>
              <div>
                Remaining budget:{" "}
                <span className="text-secondary font-medium">
                  {policy.remainingBudgetFormatted}
                </span>
              </div>
              <div className="hidden lg:block">
                Approval above:{" "}
                <span className="text-on-surface font-medium">
                  {policy.approvalAboveFormatted}
                </span>
              </div>
            </div>
            <p className="text-code-sm text-outline mt-1">
              Your agent can prepare this purchase, but the final financial
              action remains under your control.
            </p>
          </div>
          <Link
            href="/authorize"
            className="btn-primary py-2 px-6 rounded-lg text-body-md font-semibold whitespace-nowrap self-stretch md:self-auto flex items-center justify-center gap-sm"
          >
            Continue to purchase
            <MaterialIcon icon="arrow_forward" size={18} />
          </Link>
        </div>
      </div>
    </>
  );
}
