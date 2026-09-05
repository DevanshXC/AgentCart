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
  
  const res = await fetch(`${API_BASE_URL}/api/orders/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  
  if (!res.ok) {
    let errMsg = `Quote calculation failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errMsg = `Quote calculation failed: ${errJson.detail}`;
    } catch {
      const errText = await res.text().catch(() => "");
      if (errText) errMsg = `Quote calculation failed: ${errText}`;
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  return {
    ...mockPricing,
    itemsTotal: data.amount,
    finalTotal: data.amount,
    itemsTotalFormatted: `₹${(data.amount).toLocaleString('en-IN')}`,
    finalTotalFormatted: `₹${(data.amount).toLocaleString('en-IN')}`
  };
}

export async function createOrder(payload: { session_id?: string, items?: { product_id: string, quantity: number }[] }): Promise<Order> {
  if (!payload.items || payload.items.length === 0) {
    throw new Error("No items provided for createOrder");
  }

  // 1. Authoritative order preview creation
  const previewRes = await fetch(`${API_BASE_URL}/api/orders/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      session_id: payload.session_id || "test_session_1", 
      items: payload.items
    }),
    cache: "no-store"
  });
  
  if (!previewRes.ok) {
    let errMsg = `Order preview failed (${previewRes.status})`;
    try {
      const errJson = await previewRes.json();
      if (errJson.detail) errMsg = `Order preview failed: ${errJson.detail}`;
    } catch {
      const errText = await previewRes.text().catch(() => "");
      if (errText) errMsg = `Order preview failed: ${errText}`;
    }
    throw new Error(errMsg);
  }

  const previewData = await previewRes.json();
  if (!previewData?.id) {
    throw new Error("Order preview succeeded but returned no order ID");
  }
  
  // 2. Authoritative order authorization
  const authRes = await fetch(`${API_BASE_URL}/api/orders/${previewData.id}/authorize`, {
    method: "POST",
    cache: "no-store"
  });
  
  if (!authRes.ok) {
    let errMsg = `Order authorization failed (${authRes.status})`;
    try {
      const errJson = await authRes.json();
      if (errJson.detail) errMsg = `Order authorization failed: ${errJson.detail}`;
    } catch {
      const errText = await authRes.text().catch(() => "");
      if (errText) errMsg = `Order authorization failed: ${errText}`;
    }
    throw new Error(errMsg);
  }

  const authData = await authRes.json();
  if (!authData?.provider_order_id) {
    throw new Error("Order was authorized on server, but Razorpay order ID was not returned by gateway");
  }
  
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
