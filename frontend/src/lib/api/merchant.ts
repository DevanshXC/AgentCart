const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface Merchant {
  id: string;
  name: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export async function getMerchant(): Promise<Merchant> {
  const res = await fetch(`${API_BASE_URL}/api/merchant`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
