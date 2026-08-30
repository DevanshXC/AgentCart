import { PaymentTimelineStep } from "./types";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getPaymentStatus(_orderId: string): Promise<string> {
  return "PROCESSING";
}

export async function getPaymentTimeline(orderId: string, isComplete: boolean = false): Promise<PaymentTimelineStep[]> {
  if (isComplete) {
    return [
      { label: "Purchase Authorized", detail: "Policy constraints checked", status: "done" as const },
      { label: "Order Created", detail: `Order ID: ${orderId}`, status: "done" as const },
      { label: "Payment Processed", detail: "Awaiting confirmation", status: "done" as const },
      { label: "Payment Confirmed", detail: "Receipt generated", status: "done" as const },
    ];
  }
  return [
    { label: "Purchase Authorized", detail: "Policy constraints checked", status: "done" as const },
    { label: "Order Created", detail: `Order ID: ${orderId}`, status: "done" as const },
    { label: "Payment Processing", detail: "Awaiting confirmation", status: "active" as const },
    { label: "Payment Confirmed", detail: "", status: "pending" as const },
  ];
}

export async function reconcilePayment(orderId: string) {
  const res = await fetch(`${API_BASE_URL}/api/payments/reconcile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Reconciliation failed");
  return res.json();
}

export async function verifyPayment(paymentId: string, orderId: string, signature: string) {
  const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature
    }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Verification failed");
  return res.json();
}
