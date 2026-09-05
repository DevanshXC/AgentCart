import Link from "next/link";

import Breadcrumb from "@/components/Breadcrumb";
import SafetyCheck from "@/components/SafetyCheck";
import OrderSummary from "@/components/OrderSummary";
import MaterialIcon from "@/components/MaterialIcon";
import AuthorizeCta from "@/components/AuthorizeCta";
import { validatePurchase, calculateQuote } from "@/lib/api";

export default async function AuthorizePage(
  props: { searchParams: Promise<{ productId?: string }> }
) {
  const searchParams = await props.searchParams;
  const productId = searchParams.productId || "lenovo-loq-15"; // fallback for now if undefined

  const safetyChecks = await validatePurchase({});
  const pricing = await calculateQuote([{ product_id: productId, quantity: 1 }]);

  return (
    <>
      <main className="flex-grow max-w-3xl mx-auto w-full px-lg pt-md pb-lg flex flex-col gap-md">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-xs mb-md">
          <Breadcrumb
            items={[
              { label: "AI Buyer", href: "/buyer" },
              { label: "Recommendation", href: `/products/${productId}` },
              { label: "Authorization" },
            ]}
          />
          <div className="mt-xs">
            <h1 className="text-headline-lg text-on-background">
              Ready to purchase?
            </h1>
            <p className="text-body-md text-on-surface-variant mt-xs max-w-2xl">
              Your agent prepared this purchase. Review the transaction and
              authorize the financial action.
            </p>
          </div>
        </div>

        {/* The Receipt — one continuous ledger: line items, totals, safety
            checks, and the authorize action. Nothing else on this screen. */}
        <section className="bg-[var(--color-void)] border border-border-base rounded-md">
          <div className="px-lg pt-md pb-sm">
            <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-xs">
              Order Summary
            </h2>
            <OrderSummary productId={productId} />
          </div>

          <div className="border-t border-white/10 px-lg py-sm">
            <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-sm">
              Transaction Safety Checks
            </h2>
            <div className="grid grid-cols-2 gap-x-lg gap-y-sm">
              {safetyChecks.map((check, idx) => (
                <SafetyCheck
                  key={check.label}
                  label={check.label}
                  detail={check.detail}
                  index={idx}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 px-lg py-md flex flex-col gap-xs">
            <AuthorizeCta href={`/payment?productId=${productId}`} label={`Authorize ${pricing.finalTotalFormatted}`} />
            <Link
              href={`/products/${productId}`}
              className="text-center text-sm text-on-surface-variant hover:text-white transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] py-xs"
            >
              Review Order
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-background/80 backdrop-blur-md py-sm mt-md">
        <div className="max-w-[1280px] mx-auto px-lg text-center">
          <p className="text-code-sm text-outline flex items-center justify-center gap-xs">
            <MaterialIcon icon="lock" size={16} />
            No payment has been initiated. Authorization is required before the
            payment flow begins.
          </p>
        </div>
      </footer>
    </>
  );
}
