import { Product } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface AgentIntentPayload {
  category?: string;
  max_price?: number;
  requirements?: string[];
}

export interface AgentChatResponse {
  message: string;
  intent: AgentIntentPayload;
  recommended_product_id?: string;
  product_ids: string[];
  match_reasons: string[];
  tools_used: string[];
  products: Product[];
}

export interface AgentHealthResponse {
  status: string;
  provider: string;
  model: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateMatchScore(product: any, intent: AgentIntentPayload): number {
  let score = 65;
  const attrs = product.attributes || {};
  const gpu = (attrs.gpu || "").toUpperCase();
  const ram = (attrs.ram || "").toUpperCase();
  const reqs = (intent?.requirements || []).map(r => r.toLowerCase());
  
  if (reqs.includes("gaming") || reqs.includes("game")) {
    if (gpu.includes("RTX") || gpu.includes("GTX") || gpu.includes("RX")) {
      score += 12;
    }
  }
  
  if (reqs.includes("coding") || reqs.includes("programming")) {
    if (ram.includes("16GB") || ram.includes("32GB")) {
      score += 10;
    }
  }
  
  if (intent?.max_price) {
    if (product.price <= intent.max_price) {
      score += Math.min(10, Math.floor((intent.max_price - product.price) / 1000));
    } else {
      score -= 10;
    }
  }
  
  if (product.inventory > 10) {
    score += 2;
  }
  
  return Math.min(99, Math.max(10, score));
}

export async function chatWithAgent(message: string, sessionId?: string): Promise<AgentChatResponse> {
  const res = await fetch(`${API_BASE_URL}/api/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Agent API error: ${res.status}`);
  }
  
  const data = await res.json();
  
  // Need to format product prices since the backend returns raw ints
  if (data.products && Array.isArray(data.products)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.products = data.products.map((p: any) => {
      const attrs = p.attributes || {};
      return {
        ...p,
        priceFormatted: `₹${p.price.toLocaleString("en-IN")}`,
        specs: [attrs.ram, attrs.storage, attrs.gpu].filter(Boolean).join(" · ") || p.description || "",
        ram: attrs.ram || "",
        ssd: attrs.storage || "",
        gpu: attrs.gpu || "",
        matchPercent: calculateMatchScore(p, data.intent),
        inStock: p.inventory > 0,
        delivery: "2–4 days",
        image: p.image_url || "",
        heroImage: p.hero_image_url || ""
      };
    });
  }
  
  return data as AgentChatResponse;
}

export async function getAgentHealth(): Promise<AgentHealthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/agent/health`);
  if (!res.ok) throw new Error(`Agent health error: ${res.status}`);
  return await res.json();
}
