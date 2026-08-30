import { Product, Accessory } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Format a rupee price integer into a display string, e.g. 64999 → "₹64,999"
 */
function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

/**
 * Map a backend product response into the frontend Product shape.
 * The frontend expects certain derived fields (priceFormatted, specs, ram, etc.)
 * that aren't stored in the database — we compute them here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendProduct(p: any): Product {
  const attrs = p.attributes || {};
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    priceFormatted: formatPrice(p.price),
    specs: [attrs.ram, attrs.storage, attrs.gpu].filter(Boolean).join(" · ") || p.description || "",
    ram: attrs.ram || "",
    ssd: attrs.storage || "",
    gpu: attrs.gpu || "",
    matchPercent: 0, // computed by AI agent later, not from DB
    inStock: p.inventory > 0,
    delivery: "2–4 days",
    image: p.image_url || "",
    heroImage: p.hero_image_url || "",
    // Extended fields
    sku: p.sku,
    description: p.description,
    category: p.category,
    currency: p.currency,
    inventory: p.inventory,
    attributes: attrs,
  };
}

/**
 * Category-to-icon mapping for accessories.
 */
function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("mouse")) return "mouse";
  if (lower.includes("keyboard")) return "keyboard";
  if (lower.includes("stand")) return "laptop";
  if (lower.includes("hub")) return "usb";
  if (lower.includes("headphone")) return "headphones";
  if (lower.includes("webcam")) return "videocam";
  if (lower.includes("monitor")) return "monitor";
  if (lower.includes("mousepad")) return "grid_on";
  if (lower.includes("ssd") || lower.includes("storage")) return "sd_storage";
  return "devices";
}

export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.map(mapBackendProduct);
  } catch (e) {
    console.warn("Failed to fetch products from backend, falling back to mock data:", e);
    const { product: mockProduct, alternatives } = await import("@/lib/mock-data");
    return [
      { ...mockProduct, id: "lenovo-loq-15" } as unknown as Product,
      { ...alternatives[0], id: "ideapad-slim-5", image: "", heroImage: "", inStock: true, delivery: "2-4 days", ram: "16GB", ssd: "512GB", gpu: "Integrated", specs: alternatives[0].description } as unknown as Product,
      { ...alternatives[1], id: "acer-nitro-v15", image: "", heroImage: "", inStock: true, delivery: "2-4 days", ram: "8GB", ssd: "512GB", gpu: "RTX 4060", specs: alternatives[1].description } as unknown as Product,
    ];
  }
}

export async function getProduct(id: string): Promise<Product> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return mapBackendProduct(data);
  } catch (e) {
    console.warn(`Failed to fetch product ${id} from backend, falling back to mock data:`, e);
    const { product: mockProduct } = await import("@/lib/mock-data");
    if (id === "lenovo-loq-15") {
      return { ...mockProduct, id } as Product;
    }
    throw new Error("Product not found");
  }
}

export async function searchProducts(query: string, filters?: { category?: string; min_price?: number; max_price?: number; in_stock?: boolean }): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.min_price !== undefined) params.set("min_price", String(filters.min_price));
    if (filters?.max_price !== undefined) params.set("max_price", String(filters.max_price));
    if (filters?.in_stock !== undefined) params.set("in_stock", String(filters.in_stock));

    const res = await fetch(`${API_BASE_URL}/api/products/search?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.map(mapBackendProduct);
  } catch (e) {
    console.warn("Failed to search products from backend, falling back to mock data:", e);
    return getProducts();
  }
}

export async function checkInventory(productId: string, quantity: number = 1): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}/inventory`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data.in_stock && data.inventory >= quantity;
  } catch (e) {
    console.warn("Failed to check inventory from backend, falling back to mock:", e);
    return true;
  }
}

export async function getAccessories(): Promise<Accessory[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products?category=accessory`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      price: p.price,
      priceFormatted: formatPrice(p.price),
      icon: getCategoryIcon(p.name),
    }));
  } catch (e) {
    console.warn("Failed to fetch accessories from backend, falling back to mock data:", e);
    const { accessory: mockAccessory, accessory2: mockAccessory2 } = await import("@/lib/mock-data");
    return [
      { ...mockAccessory, id: "acc-1" },
      { ...mockAccessory2, id: "acc-2" },
    ];
  }
}
