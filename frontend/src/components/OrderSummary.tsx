import MaterialIcon from "./MaterialIcon";
import { getProduct, getAccessories, calculateQuote } from "@/lib/api";

interface OrderSummaryProps {
  showOrderId?: boolean;
  orderId?: string;
  compact?: boolean;
}

export default async function OrderSummary({
  showOrderId = false,
  orderId,
  compact = false,
}: OrderSummaryProps) {
  const product = await getProduct("lenovo-loq-15");
  const accessories = await getAccessories();
  const accessory = accessories[0];
  const pricing = await calculateQuote([]);

  return (
    <div className="flex flex-col gap-md">
      {showOrderId && orderId && (
        <div className="flex justify-between items-center">
          <span className="text-on-surface-variant text-code-sm">Order ID</span>
          <span className="text-on-surface text-code-sm">{orderId}</span>
        </div>
      )}

      {/* Item 1 */}
      <div className="flex justify-between items-start">
        <div className="flex gap-md">
          {!compact && (
            <div className="w-12 h-12 rounded-sm bg-surface-container flex items-center justify-center shrink-0">
              <MaterialIcon icon="laptop_mac" className="text-on-surface-variant" />
            </div>
          )}
          <div className="flex flex-col gap-xs">
            <span className="text-body-lg text-on-background font-medium">
              {product.name}
            </span>
            {!compact && (
              <span className="text-body-md text-on-surface-variant">
                {product.specs}
              </span>
            )}
          </div>
        </div>
        <span className="text-on-surface whitespace-nowrap font-medium">
          {product.priceFormatted}
        </span>
      </div>

      {/* Item 2 */}
      <div className="flex justify-between items-start">
        <div className="flex gap-md">
          {!compact && (
            <div className="w-12 h-12 rounded-sm bg-surface-container flex items-center justify-center shrink-0">
              <MaterialIcon icon="mouse" className="text-on-surface-variant" />
            </div>
          )}
          <div className="flex flex-col gap-xs">
            <span className="text-body-lg text-on-background font-medium">
              {accessory.name}
            </span>
            {!compact && (
              <span className="text-body-md text-on-surface-variant">
                {accessory.description}
              </span>
            )}
          </div>
        </div>
        <span className="text-on-surface whitespace-nowrap font-medium">
          {accessory.priceFormatted}
        </span>
      </div>

      {/* Financials */}
      <div className="flex flex-col gap-xs rounded-lg bg-surface-container p-md mt-xs">
        <div className="flex justify-between items-center text-body-md text-on-surface-variant">
          <span>Subtotal</span>
          <span>{pricing.subtotalFormatted}</span>
        </div>
        <div className="flex justify-between items-center text-body-md text-secondary">
          <span>Discount</span>
          <span>{pricing.discountFormatted}</span>
        </div>
        <div className="flex justify-between items-end mt-sm pt-sm">
          <span className="text-body-lg text-on-background">Final Total</span>
          <span className="text-headline-lg text-on-background">
            {pricing.finalTotalFormatted}
          </span>
        </div>
      </div>
    </div>
  );
}
