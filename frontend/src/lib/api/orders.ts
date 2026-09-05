import { Order, Quote } from "./types";
import { order as mockOrder, pricing as mockPricing } from "@/lib/mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function calculateQuote(items: { product_id: string, quantity: number }[]): Promise<Quote> {
  if (!items || items.length === 0) {
    throw new Error("No items provided for calculateQuote");
  }

  // Use backend for authoritative preview
  const payload = {
    session_id: "test_session_1", // Hardcoded for demo
    items: items
  };
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    
    if (res.ok) {
      const data = await res.json();
      return {
        ...mockPricing,
        itemsTotal: data.amount,
        finalTotal: data.amount,
        itemsTotalFormatted: `₹${(data.amount).toLocaleString('en-IN')}`,
        finalTotalFormatted: `₹${(data.amount).toLocaleString('en-IN')}`
      };
    }
  } catch {
    console.error("Order preview failed");
  }
  return mockPricing;
}

export async function createOrder(payload: { session_id?: string, items?: { product_id: string, quantity: number }[] }): Promise<Order> {
  if (!payload.items || payload.items.length === 0) {
    throw new Error("No items provided for createOrder");
  }

  // Wait, the Phase 4 authorization endpoint is /api/orders/{id}/authorize. 
  // We need the order ID from preview. Since it's a demo, we can just fetch it again to authorize.
  try {
    const previewRes = await fetch(`${API_BASE_URL}/api/orders/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        session_id: payload.session_id || "test_session_1", 
        items: payload.items
      }),
      cache: "no-store"
    });
    const previewData = await previewRes.json();
    
    const authRes = await fetch(`${API_BASE_URL}/api/orders/${previewData.id}/authorize`, {
      method: "POST",
      cache: "no-store"
    });
    const authData = await authRes.json();
    
    return {
      id: authData.id,
      testOrderId: authData.id,
      providerRef: authData.provider_order_id || "",
      status: authData.status || "AUTHORIZED",
      provider_order_id: authData.provider_order_id,
      quote: {
        ...mockPricing,
        finalTotal: authData.amount,
        finalTotalFormatted: `₹${(authData.amount).toLocaleString('en-IN')}`
      }
    };
  } catch {
    console.error("Order auth failed");
  }
  
  return {
    ...mockOrder,
    status: "CREATED"
  } as Order;
}

export async function getOrder(id: string): Promise<Order> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        testOrderId: data.id,
        providerRef: data.provider_order_id || "",
        status: data.status,
        provider_order_id: data.provider_order_id,
        quote: {
          ...mockPricing,
          finalTotal: data.amount,
          finalTotalFormatted: `₹${(data.amount).toLocaleString('en-IN')}`
        }
      };
    }
  } catch {}
  
  return mockOrder as Order;
}

export async function getLatestOrder(): Promise<Order> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/latest`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        testOrderId: data.id,
        providerRef: data.provider_order_id || "",
        status: data.status,
        provider_order_id: data.provider_order_id,
        session_id: data.session_id,
        quote: {
          ...mockPricing,
          finalTotal: data.amount,
          finalTotalFormatted: `₹${(data.amount).toLocaleString('en-IN')}`
        }
      };
    }
  } catch {}
  
  return mockOrder as Order;
}
