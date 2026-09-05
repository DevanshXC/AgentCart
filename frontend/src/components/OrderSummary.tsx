import { getProduct, getAccessories, calculateQuote } from "@/lib/api";

interface OrderSummaryProps {
  showOrderId?: boolean;
  orderId?: string;
  compact?: boolean;
  productId?: string;
}

export default async function OrderSummary({
  showOrderId = false,
  orderId,
  productId = "lenovo-loq-15",
}: OrderSummaryProps) {
  const product = await getProduct(productId);
  const accessories = await getAccessories();
  const accessory = accessories[0];
  const pricing = await calculateQuote([{ product_id: productId, quantity: 1 }]);

  return (
    <div className="flex flex-col">
      {showOrderId && orderId && (
        <div className="flex justify-between items-baseline pb-sm border-b border-white/10">
          <span className="text-on-surface-variant text-xs uppercase tracking-widest">
            Order ID
          </span>
          <span className="font-mono tabular-nums text-xs text-on-surface-variant">
            {orderId}
          </span>
        </div>
      )}

      {/* Line items — name + critical specs only, single line each */}
      <div className="flex justify-between items-center py-xs">
        <div className="flex items-baseline gap-sm min-w-0 pr-md">
          <span className="text-body-md text-white shrink-0">{product.name}</span>
          <span className="text-xs text-on-surface-variant line-clamp-1 min-w-0">
            {product.specs}
          </span>
        </div>
        <span className="font-mono tabular-nums text-body-md text-white whitespace-nowrap">
          {product.priceFormatted}
        </span>
      </div>
      <div className="flex justify-between items-center py-xs">
        <div className="flex items-baseline gap-sm min-w-0 pr-md">
          <span className="text-body-md text-white shrink-0">{accessory.name}</span>
          <span className="text-xs text-on-surface-variant line-clamp-1 min-w-0">
            {accessory.description}
          </span>
        </div>
        <span className="font-mono tabular-nums text-body-md text-white whitespace-nowrap">
          {accessory.priceFormatted}
        </span>
      </div>

      {/* Totals */}
      <div className="flex flex-col mt-xs pt-xs border-t border-white/10">
        <div className="flex justify-between items-baseline py-0.5">
          <span className="text-sm text-on-surface-variant">Subtotal</span>
          <span className="font-mono tabular-nums text-sm text-on-surface-variant">
            {pricing.subtotalFormatted}
          </span>
        </div>
        <div className="flex justify-between items-baseline py-0.5">
          <span className="text-sm text-on-surface-variant">Discount</span>
          <span className="font-mono tabular-nums text-sm text-on-surface-variant">
            {pricing.discountFormatted}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-baseline mt-xs pt-sm border-t border-white/10">
        <span className="text-body-lg text-white">Final Total</span>
        <span className="font-mono tabular-nums text-2xl font-semibold text-white">
          {pricing.finalTotalFormatted}
        </span>
      </div>
    </div>
  );
}
