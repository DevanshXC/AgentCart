export interface Product {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  specs: string;
  ram: string;
  ssd: string;
  gpu: string;
  matchPercent: number;
  inStock: boolean;
  delivery: string;
  image: string;
  heroImage: string;
  // Extended fields from backend
  sku?: string;
  description?: string;
  category?: string;
  currency?: string;
  inventory?: number;
  attributes?: Record<string, string>;
}

export interface Accessory {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceFormatted: string;
  icon: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  priceFormatted: string;
}

export interface Quote {
  subtotal: number;
  subtotalFormatted: string;
  discount: number;
  discountFormatted: string;
  finalTotal: number;
  finalTotalFormatted: string;
  itemsTotal?: number;
  itemsTotalFormatted?: string;
}

export interface Order {
  id: string;
  testOrderId?: string;
  providerRef?: string;
  items?: OrderItem[];
  quote: Quote;
  status: string;
  provider_order_id?: string;
  session_id?: string;
}

export interface PaymentTimelineStep {
  label: string;
  detail: string;
  status: "done" | "active" | "pending";
}

export interface CommercePolicy {
  maxPurchase: number;
  maxPurchaseFormatted: string;
  approvalAbove: number;
  approvalAboveFormatted: string;
  maxDiscountPercent: number;
  remainingBudget: number;
  remainingBudgetFormatted: string;
}

export interface SafetyCheck {
  label: string;
  detail: string;
}

export interface AuditEvent {
  time: string;
  type: string;
  description: string;
  dotColor: string;
  status: string | null;
  isHighlighted?: boolean;
}

export interface AgentEvent {
  label: string;
  done: boolean;
}

export interface ActivitySummary {
  agentActions: number;
  policyChecks: number;
  financialActions: number;
  recoveries: number;
}
