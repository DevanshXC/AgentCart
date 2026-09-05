"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import MoneyValue from "@/components/MoneyValue";
import { getProduct, getAccessories, createOrder, getPaymentTimeline } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type PaymentStatus = "INITIALIZING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "FAILED";

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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("INITIALIZING");
  const [failureReason, setFailureReason] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const initStarted = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rzpInstanceRef = useRef<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openRazorpay = (order: any, pricing: any) => {
    const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!rzpKey) {
      console.error("Missing NEXT_PUBLIC_RAZORPAY_KEY_ID");
      alert("Configuration Error: Razorpay Key ID is missing.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window === "undefined" || !(window as any).Razorpay) {
      console.error("Razorpay SDK not loaded");
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
            setPaymentStatus("COMPLETED");
          } else {
            setPaymentStatus("FAILED");
            setFailureReason("Server failed to verify payment signature.");
          }
        } catch (e) {
          console.error(e);
          setPaymentStatus("FAILED");
          setFailureReason("Network error during payment verification.");
        }
      },
      modal: {
        ondismiss: function () {
          setPaymentStatus((current) => (current === "COMPLETED" ? "COMPLETED" : "CANCELLED"));
        }
      },
      prefill: { name: "Agent Buyer", email: "buyer@agentcart.com", contact: "9999999999" },
      theme: { color: "#3B82F6" }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzp1 = new (window as any).Razorpay(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rzp1.on("payment.failed", function (response: any) {
      console.warn("Razorpay payment.failed:", response?.error);
      setPaymentStatus("FAILED");
      const desc = response?.error?.description || response?.error?.reason || "Transaction failed.";
      setFailureReason(desc);
    });

    rzpInstanceRef.current = rzp1;
    rzp1.open();
  };

  useEffect(() => {
    async function initCheckout() {
      if (initStarted.current) return;
      initStarted.current = true;

      const params = new URLSearchParams(window.location.search);
      const productId = params.get("productId") || "P0024";

      try {
        const product = await getProduct(productId);
        const accessories = await getAccessories();
        const accessory =
          accessories && accessories.length > 0
            ? accessories[0]
            : { name: "Standard Delivery & Insurance", priceFormatted: "₹0" };

        // Call authorize (createOrder wraps preview + authorize)
        const order = await createOrder({ items: [{ product_id: productId, quantity: 1 }] });
        const pricing = order.quote || {};
        const timelinePending = await getPaymentTimeline(order.id, false);
        const timelineComplete = await getPaymentTimeline(order.id, true);

        setData({ product, accessory, order, pricing, timelinePending, timelineComplete });
        setPaymentStatus("PROCESSING");

        const res = await loadRazorpay();
        if (!res || !order.provider_order_id) {
          console.error("Razorpay SDK failed to load or missing provider order ID");
          setPaymentStatus("FAILED");
          setFailureReason("Payment gateway failed to initialize.");
          return;
        }

        openRazorpay(order, pricing);
      } catch (err: unknown) {
        console.error("Failed to initialize checkout:", err);
        setPaymentStatus("FAILED");
        const msg = err instanceof Error ? err.message : "Failed to initialize order.";
        setFailureReason(msg);
      }
    }
    initCheckout();
  }, []);

  const handleRetry = () => {
    if (!data?.order?.provider_order_id) {
      console.error("No valid order to retry");
      return;
    }
    setPaymentStatus("PROCESSING");
    if (rzpInstanceRef.current) {
      try {
        rzpInstanceRef.current.open();
        return;
      } catch (err) {
        console.warn("Could not reopen existing instance, reopening new instance:", err);
      }
    }
    openRazorpay(data.order, data.pricing);
  };

  if (!data && paymentStatus === "INITIALIZING") {
    return (
      <main className="flex-grow pt-16 pb-24 px-md lg:px-xl max-w-3xl mx-auto w-full flex flex-col items-center justify-center gap-md">
        <MaterialIcon icon="sync" className="text-4xl text-secondary animate-spin-slow" />
        <h1 className="text-headline-md">Initializing secure payment...</h1>
        <p className="text-body-md text-on-surface-variant">Preparing your authorized order details.</p>
      </main>
    );
  }

  if (!data) return null;

  const { product, accessory, order, pricing, timelinePending, timelineComplete } = data;
  const isComplete = paymentStatus === "COMPLETED";
  const timeline = isComplete ? timelineComplete : timelinePending;

  return (
    <>
      <main className="flex-grow pt-16 pb-24 px-md lg:px-xl max-w-3xl mx-auto w-full flex flex-col gap-lg">
        {/* Header */}
        <div className="flex flex-col gap-sm text-center items-center">
          <MaterialIcon
            icon={
              paymentStatus === "COMPLETED"
                ? "check_circle"
                : paymentStatus === "CANCELLED"
                ? "cancel"
                : paymentStatus === "FAILED"
                ? "error"
                : "sync"
            }
            fill={paymentStatus === "COMPLETED"}
            className={`text-4xl mb-sm ${
              paymentStatus === "COMPLETED"
                ? "text-secondary animate-pop-in"
                : paymentStatus === "CANCELLED"
                ? "text-tertiary animate-pop-in"
                : paymentStatus === "FAILED"
                ? "text-error animate-pop-in"
                : "text-secondary animate-spin-slow"
            }`}
          />
          <h1 className="text-headline-lg">
            {paymentStatus === "COMPLETED"
              ? "Purchase complete"
              : paymentStatus === "CANCELLED"
              ? "Payment Cancelled"
              : paymentStatus === "FAILED"
              ? "Payment Failed"
              : "Secure payment"}
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            {paymentStatus === "COMPLETED"
              ? `Your payment of ${pricing.finalTotalFormatted} was successfully processed.`
              : paymentStatus === "CANCELLED"
              ? "Checkout was closed before completion. Your order remains authorized and your reservation is held until expiry."
              : paymentStatus === "FAILED"
              ? failureReason || "Your payment could not be processed. Please try again."
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
              {Array.isArray(timeline) &&
                timeline.map(
                  (step: { status: string; label: string; detail?: string }, i: number) => {
                    const delay = (i + 1) * 100;
                    const delayClass = delay <= 500 ? `delay-${delay}` : "delay-500";
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
                          <span className="text-body-md text-on-surface">{step.label}</span>
                          {step.detail && (
                            <span className="text-label-caps text-on-surface-variant mt-xs">
                              {step.detail}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
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
                  <span className="text-on-surface">{product?.name || "Selected Product"}</span>
                  <MoneyValue size="sm" className="text-on-surface">
                    {product?.priceFormatted || `₹${(product?.price || 0).toLocaleString("en-IN")}`}
                  </MoneyValue>
                </div>
                <div className="flex justify-between items-center py-sm">
                  <span className="text-on-surface">{accessory?.name || "Included Item"}</span>
                  <MoneyValue size="sm" className="text-on-surface">
                    {accessory?.priceFormatted || "₹0"}
                  </MoneyValue>
                </div>
                <div className="flex justify-between items-center py-sm text-secondary">
                  <span>Discount</span>
                  <span>{pricing.discountFormatted || "₹0"}</span>
                </div>
              </div>
            </div>
            <div className="mt-md pt-md flex justify-between items-center border-t border-border-base">
              <span className="text-body-md text-on-surface-variant">Final Total</span>
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
              <div className="text-body-md text-on-surface">Powered by Razorpay Test Mode</div>
              <div className="text-code-sm text-on-surface-variant mt-xs">
                Provider Ref: {order.providerRef || order.provider_order_id}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-sm px-md py-sm rounded-full bg-level-2 border border-border-base">
            <div
              className={`w-2 h-2 rounded-full ${
                paymentStatus === "COMPLETED"
                  ? "bg-secondary"
                  : paymentStatus === "CANCELLED"
                  ? "bg-tertiary"
                  : paymentStatus === "FAILED"
                  ? "bg-error"
                  : "bg-secondary animate-pulse-dot"
              }`}
            />
            <span
              className={`text-label-caps ${
                paymentStatus === "COMPLETED"
                  ? "text-secondary"
                  : paymentStatus === "CANCELLED"
                  ? "text-tertiary"
                  : paymentStatus === "FAILED"
                  ? "text-error"
                  : "text-secondary"
              }`}
            >
              {paymentStatus}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-md justify-center mt-lg">
          {paymentStatus === "COMPLETED" && (
            <>
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
            </>
          )}

          {(paymentStatus === "CANCELLED" || paymentStatus === "FAILED") && (
            <>
              <button
                type="button"
                onClick={handleRetry}
                className="btn-primary text-body-md px-lg py-md rounded-sm text-center flex items-center justify-center gap-sm cursor-pointer"
              >
                <MaterialIcon icon="refresh" size={18} />
                Retry Payment
              </button>
              <Link
                href="/buyer"
                className="btn-secondary text-body-md px-lg py-md rounded-sm text-center flex items-center justify-center gap-sm"
              >
                <MaterialIcon icon="arrow_back" size={18} />
                Back / Choose Another Item
              </Link>
            </>
          )}

          {(paymentStatus === "PROCESSING" || paymentStatus === "INITIALIZING") && (
            <div className="text-body-md text-on-surface-variant flex items-center gap-sm py-sm">
              <MaterialIcon icon="lock" size={16} />
              <span>Awaiting transaction in Razorpay Checkout...</span>
            </div>
          )}
        </div>

        {/* Footer Trust */}
        <div className="flex flex-col items-center justify-center gap-sm mt-auto text-center opacity-70">
          <div className="flex items-center gap-sm text-label-caps text-on-surface-variant">
            <MaterialIcon icon="verified_user" size={16} />
            Transaction completed within your approved limits
          </div>
          <div className="flex gap-md mt-xs">
            <div className="flex items-center gap-xs text-code-sm text-on-surface-variant">
              <MaterialIcon icon="check_circle" fill className="text-secondary" size={14} />
              Policy
            </div>
            <div className="flex items-center gap-xs text-code-sm text-on-surface-variant">
              <MaterialIcon icon="check_circle" fill className="text-secondary" size={14} />
              Budget
            </div>
            <div className="flex items-center gap-xs text-code-sm text-on-surface-variant">
              <MaterialIcon icon="check_circle" fill className="text-secondary" size={14} />
              Auth
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
