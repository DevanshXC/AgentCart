import { CommercePolicy, SafetyCheck } from "./types";
import { safetyChecks as mockSafetyChecks } from "@/lib/mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

export async function getCommercePolicy(): Promise<CommercePolicy> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/policy`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return {
      maxPurchase: data.max_order_amount,
      maxPurchaseFormatted: formatPrice(data.max_order_amount),
      approvalAbove: data.require_confirmation_above,
      approvalAboveFormatted: formatPrice(data.require_confirmation_above),
      maxDiscountPercent: data.max_discount_percent,
      // remainingBudget is a computed value that depends on cart context —
      // for now, use max_order_amount minus a hardcoded product price placeholder.
      // This will be properly computed when the order service is implemented.
      remainingBudget: data.max_order_amount - 64999,
      remainingBudgetFormatted: formatPrice(data.max_order_amount - 64999),
    };
  } catch (e) {
    console.warn("Failed to fetch policy from backend, falling back to mock data:", e);
    const { policy: mockPolicy } = await import("@/lib/mock-data");
    return mockPolicy;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function validatePurchase(_payload: Record<string, unknown>): Promise<SafetyCheck[]> {
  // Purchase validation will be implemented in a later phase
  return mockSafetyChecks;
}
