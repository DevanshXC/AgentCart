"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import MoneyValue from "@/components/MoneyValue";
import { getProduct, getAccessories, createOrder, getPaymentTimeline } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PaymentPage() {
  const [isComplete, setIsComplete] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const initStarted = useRef(false);

  useEffect(() => {
    async function initCheckout() {
      if (initStarted.current) return;
      initStarted.current = true;

      const params = new URLSearchParams(window.location.search);
      const productId = params.get("productId") || "lenovo-loq-15";

      const product = await getProduct(productId);
      const accessories = await getAccessories();
      const accessory = accessories[0];
      
      // Call authorize (createOrder wraps preview + authorize)
      const order = await createOrder({ items: [{ product_id: productId, quantity: 1 }] });
      const pricing = order.quote || {};
      const timelinePending = await getPaymentTimeline(order.id, false);
      const timelineComplete = await getPaymentTimeline(order.id, true);
      
      setData({ product, accessory, order, pricing, timelinePending, timelineComplete });
      
      const res = await loadRazorpay();
      if (!res || !order.provider_order_id) {
        console.error("Razorpay SDK failed to load or missing provider order ID");
        return;
      }
      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!rzpKey) {
        console.error("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");
        alert("Configuration Error: Razorpay Key ID is missing.");
        return;
      }
      
      const options = {
        key: rzpKey,
        amount: pricing.finalTotal * 100,
        currency: "INR",
        name: "AgentCart Demo",
        description: "Test Transaction",
        order_id: order.provider_order_id,
        handler: async function (response: Record<string, string>) {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            if (verifyRes.ok) {
              setIsComplete(true);
            }
          } catch(e) {
            console.error(e);
          }
        },
        prefill: { name: "Agent Buyer", email: "buyer@agentcart.com", contact: "9999999999" },
        theme: { color: "#3B82F6" }
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.open();
    }
    initCheckout();
  }, []);

  if (!data) return null; // Simple loading state

  const { product, accessory, order, pricing, timelinePending, timelineComplete } = data;
  const timeline = isComplete ? timelineComplete : timelinePending;

  return (
    <>


      <main className="flex-grow pt-16 pb-24 px-md lg:px-xl max-w-3xl mx-auto w-full flex flex-col gap-lg">
        {/* Header */}
        <div className="flex flex-col gap-sm text-center items-center">
          <MaterialIcon
            icon={isComplete ? "check_circle" : "sync"}
            fill={isComplete}
            className={`text-4xl text-secondary mb-sm ${
              isComplete ? "animate-pop-in" : "animate-spin-slow"
            }`}
          />
          <h1 className="text-headline-lg">
            {isComplete ? "Purchase complete" : "Secure payment"}
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            {isComplete
              ? `Your payment of ${pricing.finalTotalFormatted} was successfully processed.`
              : "Processing your authorized purchase."}
          </p>
        </div>

        {/* Order Summary & Timeline Bento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {/* Timeline */}
          <div className="glass-panel rounded-lg p-lg relative flex flex-col gap-md">
            <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-sm">
              Transaction Flow
            </h2>
            <div className="relative pl-xl">
              <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-border-base" />
              {Array.isArray(timeline) && timeline.map((step: { status: string; label: string; detail?: string }, i: number) => {
                const delay = (i + 1) * 100;
                const delayClass = delay <= 500 ? `delay-${delay}` : 'delay-500';
                return (
                <div
                  key={i}
                  className={`relative mb-lg flex gap-md items-start animate-fade-in-up ${delayClass}`}
                >
                  {step.status === "done" ? (
                    <div className="absolute -left-xl w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center z-10">
                      <MaterialIcon
                        icon="check"
                        className="text-on-secondary"
                        size={14}
                      />
                    </div>
                  ) : step.status === "active" ? (
                    <div className="absolute -left-xl w-6 h-6 rounded-full bg-level-2 border-2 border-secondary flex items-center justify-center z-10 animate-pulse-dot">
                      <div className="w-2 h-2 rounded-full bg-secondary" />
                    </div>
                  ) : (
                    <div className="absolute -left-xl w-6 h-6 rounded-full bg-level-1 border border-border-base flex items-center justify-center z-10" />
                  )}
                  <div
                    className={`flex flex-col ${
                      step.status === "pending" && !isComplete ? "opacity-50" : ""
                    }`}
                  >
                    <span className="text-body-md text-on-surface">
                      {step.label}
                    </span>
                    {step.detail && (
                      <span className="text-label-caps text-on-surface-variant mt-xs">
                        {step.detail}
                      </span>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* Order Summary */}
          <div className="glass-panel rounded-lg p-lg flex flex-col justify-between animate-fade-in-up delay-200">
            <div>
              <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-md">
                Order Summary
              </h2>
              <div className="flex flex-col gap-sm text-code-sm">
                <div className="flex justify-between items-center pb-sm">
                  <span className="text-on-surface-variant">Order ID</span>
                  <span className="text-on-surface">{order.id}</span>
                </div>
                <div className="flex justify-between items-center py-sm">
                  <span className="text-on-surface">{product.name}</span>
                  <MoneyValue size="sm" className="text-on-surface">
                    {product.priceFormatted}
                  </MoneyValue>
                </div>
                <div className="flex justify-between items-center py-sm">
                  <span className="text-on-surface">{accessory.name}</span>
                  <MoneyValue size="sm" className="text-on-surface">
                    {accessory.priceFormatted}
                  </MoneyValue>
                </div>
                <div className="flex justify-between items-center py-sm text-secondary">
                  <span>Discount</span>
                  <span>{pricing.discountFormatted}</span>
                </div>
              </div>
            </div>
            <div className="mt-md pt-md flex justify-between items-center border-t border-border-base">
              <span className="text-body-md text-on-surface-variant">
                Final Total
              </span>
              <MoneyValue size="md" className="text-on-surface">
                {pricing.finalTotalFormatted}
              </MoneyValue>
            </div>
          </div>
        </div>

        {/* Provider Card */}
        <div className="glass-panel rounded-lg p-lg flex flex-col md:flex-row justify-between items-center gap-md animate-fade-in-up delay-300">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-lg bg-level-2 flex items-center justify-center">
              <MaterialIcon icon="account_balance" className="text-secondary" />
            </div>
            <div>
              <div className="text-body-md text-on-surface">
                Powered by Razorpay Test Mode
              </div>
              <div className="text-code-sm text-on-surface-variant mt-xs">
                Provider Ref: {order.providerRef}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-sm px-md py-sm rounded-full">
            <div
              className={`w-2 h-2 rounded-full bg-secondary ${
                !isComplete ? "animate-pulse-dot" : ""
              }`}
            />
            <span className="text-label-caps text-secondary">
              {isComplete ? "COMPLETED" : "PROCESSING"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className={`flex flex-col sm:flex-row gap-md justify-center mt-lg transition-opacity duration-500 ${
            isComplete
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <Link
            href="/activity"
            className="btn-primary text-body-md px-lg py-md rounded-sm text-center"
          >
            View Order
          </Link>
          <Link
            href="/activity"
            className="btn-secondary text-body-md px-lg py-md rounded-sm text-center"
          >
            View Agent Activity
          </Link>
        </div>

        {/* Footer Trust */}
        <div className="flex flex-col items-center justify-center gap-sm mt-auto text-center opacity-70">
          <div className="flex items-center gap-sm text-label-caps text-on-surface-variant">
            <MaterialIcon icon="verified_user" size={16} />
            Transaction completed within your approved limits
          </div>
          <div className="flex gap-md mt-xs">
            <div className="flex items-center gap-xs text-code-sm text-on-surface-variant">
              <MaterialIcon
                icon="check_circle"
                fill
                className="text-secondary"
                size={14}
              />
              Policy
            </div>
            <div className="flex items-center gap-xs text-code-sm text-on-surface-variant">
              <MaterialIcon
                icon="check_circle"
                fill
                className="text-secondary"
                size={14}
              />
              Budget
            </div>
            <div className="flex items-center gap-xs text-code-sm text-on-surface-variant">
              <MaterialIcon
                icon="check_circle"
                fill
                className="text-secondary"
                size={14}
              />
              Auth
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
