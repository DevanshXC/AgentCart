// ── Product & Pricing ──────────────────────────────────────────────
export const product = {
  name: "Lenovo LOQ 15",
  price: 64999,
  priceFormatted: "₹64,999",
  specs: "16GB RAM · 512GB SSD · RTX 4050",
  ram: "16GB RAM",
  ssd: "512GB SSD",
  gpu: "RTX 4050",
  matchPercent: 94,
  inStock: true,
  delivery: "2–4 days",
  image:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuANxibGnRSuO191yXH9KuvHTQckEIdwvtnCj7Ht0OwXLvs98xwSmSGV4GrudmgeRQUwjXCGv0Dcriqm82G3AtcB93yaGwrnbqOprsg13o8sRThRhUYxI-iYNKxauwm5MkZZEa7etqCSY5oRKuBIuqNzpNR9keVBOYPCVwxA0ImGc6I2rWTozkbrCshem7JrgaMP-XO5qcTK3-vrP4P9z9WccUeptDeX9Efs6gXzBPWHAtzuE4lsE8mO",
  heroImage:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBIGkySwKIHKJfjkoZDIhqixJzreSC-72-3ib_OPH0r5CVAy_t4XXMd9HTin7jH6NWXV4TmiE3VVGJFG0lyfisOwzl2FuuiXIlo_2iwSRL2re3DxOSFNHSFakn2Sqq7uXDV0rPZ7aYMbsOIOKlpecydWSciJBm_NUId4vXWJ7eOrW3qXOv7GDCLVy_45Mswhub9pzzSmfj3VtLJQnl3i5iK_lS_M7qyvCajZ9OL8_cveqeezUChsBkO",
};

export const accessory = {
  name: "Wireless Mouse",
  description: "Ergonomic, Bluetooth 5.0",
  price: 1499,
  priceFormatted: "₹1,499",
  icon: "mouse",
};

export const accessory2 = {
  name: "Mechanical Keyboard",
  price: 3499,
  priceFormatted: "₹3,499",
  icon: "keyboard",
};

export const pricing = {
  subtotal: 66498,
  subtotalFormatted: "₹66,498",
  discount: 300,
  discountFormatted: "-₹300",
  finalTotal: 66198,
  finalTotalFormatted: "₹66,198",
};

// ── Policy Limits ──────────────────────────────────────────────────
export const policy = {
  maxPurchase: 70000,
  maxPurchaseFormatted: "₹70,000",
  approvalAbove: 25000,
  approvalAboveFormatted: "₹25,000",
  maxDiscountPercent: 10,
  remainingBudget: 5001,
  remainingBudgetFormatted: "₹5,001",
};

// ── Order ──────────────────────────────────────────────────────────
export const order = {
  id: "AGC-2026-00124",
  testOrderId: "TEST_ORDER_AGC_00124",
  providerRef: "rzp_test_124xYz",
};

// ── Alternatives (AI Buyer screen) ─────────────────────────────────
export const alternatives = [
  {
    name: "Lenovo IdeaPad Slim 5",
    price: "₹68,500",
    matchPercent: 88,
    description:
      "Better CPU, but integrated graphics. Less ideal for gaming.",
    matchColor: "text-secondary",
    dotColor: "bg-secondary",
  },
  {
    name: "Acer Nitro V 15",
    price: "₹69,990",
    matchPercent: 82,
    description:
      "RTX 4060, but only 8GB RAM. Might struggle with heavy coding.",
    matchColor: "text-primary",
    dotColor: "bg-primary",
  },
];

// ── Why This Matches (shared) ──────────────────────────────────────
export const matchReasons = [
  "Within budget (₹70k)",
  "16GB RAM for Coding",
  "RTX 4050 for Gaming",
  "512GB Fast SSD",
  "Currently in stock",
];

// ── Agent Status Steps (AI Buyer) ──────────────────────────────────
export const agentSteps = [
  { label: "Understanding request", done: true },
  { label: "Checking budget", done: true },
  { label: "Searching merchant catalog", done: true },
  { label: "Selecting best match", done: false },
];

// ── Suggestion Chips ───────────────────────────────────────────────
export const suggestions = [
  "Find a laptop",
  "Build a gaming setup",
  "Compare headphones",
  "Find the best value",
];

// ── Safety Checks (Authorization) ──────────────────────────────────
export const safetyChecks = [
  { label: "Price Verified", detail: "Expected: ₹66,498" },
  { label: "Inventory Available", detail: "1 unit reserved" },
  { label: "Budget Policy Pass", detail: "Limit: ₹70,000" },
  { label: "Merchant Approved", detail: "Discount: ₹300 (Max 10%)" },
];

// ── Agent Autonomy ─────────────────────────────────────────────────
export const agentActionsPerformed = [
  "Search & Compare",
  "Prepare Cart",
  "Calculate Totals",
];

export const agentActionsRestricted = [
  "Complete payment",
  "Exceed budget limit",
  "Override policies",
];

// ── Requirement Matching (Product page) ────────────────────────────
export const requirementMatching = [
  { label: "Coding", value: "Strong match", icon: "signal_cellular_alt", valueColor: "text-secondary" },
  { label: "Gaming", value: "Strong match", icon: "sports_esports", valueColor: "text-secondary" },
  { label: "Budget", value: "₹5,001 remaining", icon: null, valueColor: "text-primary" },
  { label: "Availability", value: "In stock", icon: null, valueColor: "text-on-surface-variant" },
];

// ── Payment Timeline ───────────────────────────────────────────────
export const paymentTimeline = [
  { label: "Purchase Authorized", detail: "Policy constraints checked", status: "done" as const },
  { label: "Order Created", detail: `Order ID: ${order.testOrderId}`, status: "done" as const },
  { label: "Payment Processing", detail: "Awaiting confirmation", status: "active" as const },
  { label: "Payment Confirmed", detail: "", status: "pending" as const },
];

export const paymentTimelineComplete = [
  { label: "Purchase Authorized", detail: "Policy constraints checked", status: "done" as const },
  { label: "Order Created", detail: `Order ID: ${order.testOrderId}`, status: "done" as const },
  { label: "Payment Processed", detail: "Awaiting confirmation", status: "done" as const },
  { label: "Payment Confirmed", detail: "Receipt generated", status: "done" as const },
];

// ── Recovery Timeline ──────────────────────────────────────────────
export const recoveryTimeline = [
  { label: "Payment request sent", time: "10:42:01 AM", type: "success" as const },
  { label: "Gateway response timed out", time: "10:42:35 AM", type: "warning" as const },
  { label: "Payment state became UNKNOWN", detail: "System triggered automated safety protocols.", time: "", type: "critical" as const },
  { label: "Reconciliation started", time: "10:42:36 AM", type: "success" as const },
  { label: "Existing payment state found", time: "10:42:38 AM", type: "success" as const },
  { label: "Duplicate payment prevented", time: "10:42:38 AM", type: "success" as const },
  { label: "Final state: Payment confirmed safely", time: "10:42:40 AM", type: "final" as const },
];

// ── Recovery Summary ───────────────────────────────────────────────
export const recoverySummary = [
  { label: "Failure", value: "Gateway API timeout" },
  { label: "Order", value: order.id, mono: true },
  { label: "Amount", value: pricing.finalTotalFormatted, mono: true },
  { label: "Recovery", value: "Payment reconciliation" },
  { label: "Final state", value: "Payment confirmed", valueColor: "text-secondary" },
  { label: "Duplicate charge", value: "Prevented", valueColor: "text-secondary" },
];

export const recoveryExplanations = [
  "System enforced idempotency keys prevent multiple charges for the same order ID.",
  "Automated webhook reconciliation verified transaction status directly with the gateway.",
  "State machine locked order processing until definitive payment status was confirmed.",
];

// ── Activity Events ────────────────────────────────────────────────
export const activityEvents = [
  { time: "18:21:52", type: "USER INTENT", description: "Find a laptop for coding and gaming under ₹70,000.", dotColor: "bg-on-surface-variant", status: null },
  { time: "18:21:54", type: "CATALOG SEARCH", description: "Agent searched the merchant catalog. Result: 42 products analyzed.", dotColor: "bg-on-surface-variant", status: null },
  { time: "18:21:57", type: "RECOMMENDATION", description: "Selected: Lenovo LOQ 15. 94% match.", dotColor: "bg-on-surface-variant", status: null },
  { time: "18:22:01", type: "POLICY CHECK", description: "Budget validation: ₹66,198 ≤ ₹70,000", dotColor: "bg-primary", status: "PASSED", isHighlighted: true },
  { time: "18:22:03", type: "MERCHANT POLICY", description: "Discount and transaction rules validated.", dotColor: "bg-on-surface-variant", status: null },
  { time: "18:22:10", type: "USER AUTHORIZATION", description: "User approved: ₹66,198", dotColor: "bg-primary", status: null },
];

export const activitySummary = {
  agentActions: 8,
  policyChecks: 3,
  financialActions: 2,
  recoveries: 0,
};

export const policyCheckDetail = {
  orderAmount: "₹66,198",
  maximumAllowed: "₹70,000",
  policySource: "Merchant Commerce Policy",
  decision: "ALLOW",
  payload: `{
  "event_id": "evt_9f8b7c6d",
  "type": "policy.validation",
  "timestamp": "2026-10-24T18:22:01Z",
  "context": {
    "intent_budget": 70000,
    "cart_total": 66198,
    "currency": "INR"
  },
  "result": {
    "status": "passed",
    "reason": "cart_total <= intent_budget"
  }
}`,
};

export const financialSafety = [
  "LLM never determines final amount",
  "Backend validates price",
  "Strict budget adherence",
  "Merchant policy compliance",
  "User explicit authorization",
  "Auditable transaction log",
];

export const agentPermissions = {
  allowed: "Search, Compare, Recommend, Prepare, Calculate",
  restricted: "Complete payment without auth, Exceed limit, Override policy",
};

// ── User avatar ────────────────────────────────────────────────────
export const userAvatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD5UL8LBS7UZBfn8yV52BytKarzX8TDOoaD64GfZ-ZJ9U0nqE8W6XjkcIPaGV3h3jF9pm4CisR-mwK8612y1kdUvLflnSChv1XYBwoKhj2vMdoaiEXJ2u9fTJy9RfypAg5imEby9SYFrYYhsrsPtBm3i9vcOBLL0NzWhvjsEueVusZzZlR2XsuNNlHdg0N9TcDYrdWJSlgWc6RL02emO-ndQrrY_UykSl07J34onYuELGIuk_hCDHne";
