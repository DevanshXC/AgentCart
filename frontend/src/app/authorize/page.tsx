import Link from "next/link";

import Breadcrumb from "@/components/Breadcrumb";
import SafetyCheck from "@/components/SafetyCheck";
import OrderSummary from "@/components/OrderSummary";
import MaterialIcon from "@/components/MaterialIcon";
import { validatePurchase, getAuthorizeData, calculateQuote } from "@/lib/api";

export default async function AuthorizePage() {
  const safetyChecks = await validatePurchase({});
  const { agentActionsPerformed, agentActionsRestricted } = await getAuthorizeData();
  const pricing = await calculateQuote([]);

  return (
    <>

      <main className="flex-grow max-w-4xl mx-auto w-full px-md md:px-xl pt-lg pb-xl flex flex-col gap-lg">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-sm">
          <Breadcrumb
            items={[
              { label: "AI Buyer", href: "/buyer" },
              { label: "Recommendation", href: "/products/lenovo-loq-15" },
              { label: "Authorization" },
            ]}
          />
          <div className="mt-sm">
            <h1 className="text-headline-lg text-on-background">
              Ready to purchase?
            </h1>
            <p className="text-body-lg text-on-surface-variant mt-xs max-w-2xl">
              Your agent prepared this purchase. Review the transaction and
              authorize the financial action.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg items-start">
          {/* Left: Order Details & Checks */}
          <div className="md:col-span-7 flex flex-col gap-lg">
            {/* Order Summary */}
            <section className="glass-panel rounded-lg p-lg">
              <h2 className="text-label-caps text-outline mb-md tracking-wider">
                Order Summary
              </h2>
              <OrderSummary />
            </section>

            {/* Transaction Safety */}
            <section className="glass-panel rounded-lg p-lg">
              <h2 className="text-label-caps text-outline mb-md tracking-wider">
                Transaction Safety Checks
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                {safetyChecks.map((check) => (
                  <SafetyCheck
                    key={check.label}
                    label={check.label}
                    detail={check.detail}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right: Agent Autonomy & Action Panel */}
          <div className="md:col-span-5 flex flex-col gap-lg">
            {/* Bounded Autonomy */}
            <section className="glass-panel rounded-lg p-lg">
              <div className="flex items-center gap-sm mb-md">
                <MaterialIcon icon="robot_2" className="text-primary" />
                <h2 className="text-label-caps text-on-background tracking-wider">
                  Agent Autonomy Status
                </h2>
              </div>
              <div className="flex flex-col gap-md">
                <div className="flex flex-col gap-sm">
                  <span className="text-code-sm text-outline">
                    ACTIONS PERFORMED
                  </span>
                  <ul className="flex flex-col gap-xs">
                    {agentActionsPerformed.map((action: string) => (
                      <li
                        key={action}
                        className="flex items-center gap-xs text-body-md text-on-surface-variant"
                      >
                        <MaterialIcon
                          icon="check"
                          className="text-secondary"
                          size={16}
                        />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-sm pt-sm">
                  <span className="text-code-sm text-outline">
                    REQUIRES AUTHORIZATION
                  </span>
                  <ul className="flex flex-col gap-xs">
                    {agentActionsRestricted.map((action: string) => (
                      <li
                        key={action}
                        className="flex items-center gap-xs text-body-md text-on-surface-variant"
                      >
                        <MaterialIcon
                          icon="close"
                          className="text-error"
                          size={16}
                        />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Authorization Action Panel */}
            <section className="popover-panel rounded-lg p-lg flex flex-col gap-md relative overflow-hidden">
              <div className="absolute inset-0 bg-primary-container opacity-[0.02] pointer-events-none" />
              <div className="flex items-start gap-sm mb-sm z-10">
                <MaterialIcon icon="warning" className="text-tertiary" />
                <p className="text-body-md text-on-background">
                  Your approval is required. The agent has prepared this purchase
                  but cannot initiate the final financial action until you
                  authorize it.
                </p>
              </div>
              <div className="flex flex-col items-center justify-center py-md bg-surface rounded-lg z-10">
                <span className="text-label-caps text-outline mb-xs tracking-wider">
                  Purchase Amount
                </span>
                <span className="text-headline-lg text-on-background">
                  {pricing.finalTotalFormatted}
                </span>
              </div>
              <div className="flex flex-col gap-sm mt-sm z-10">
                <Link
                  href="/payment"
                  className="w-full btn-primary py-sm px-md rounded-lg text-body-lg font-medium text-center hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background"
                >
                  Authorize {pricing.finalTotalFormatted}
                </Link>
                <Link
                  href="/products/lenovo-loq-15"
                  className="w-full btn-secondary py-sm px-md rounded-lg text-body-lg text-center hover:bg-surface-container-high transition-colors focus:outline-none focus:ring-2 focus:ring-outline focus:ring-offset-2 focus:ring-offset-background"
                >
                  Review Order
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-background/80 backdrop-blur-md py-lg mt-lg">
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
