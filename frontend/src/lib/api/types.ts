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
  // Display fields, derived for the timeline UI
  time: string;
  type: string;
  description: string;
  dotColor: string;
  status: string | null;
  isHighlighted?: boolean;
  // Raw backend fields (AuditEventResponse), preserved for the detail panel.
  // Optional because mock/fallback events don't carry them.
  id?: string;
  timestamp?: string;
  session_id?: string;
  order_id?: string | null;
  actor?: string;
  event_type?: string;
  action?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input_data?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output_data?: Record<string, any> | null;
  policy_result?: string | null;
  result?: string;
  provider_event_id?: string | null;
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
