import MaterialIcon from "@/components/MaterialIcon";
import { getMerchant, getCommercePolicy, getProducts } from "@/lib/api";

export default async function MerchantPage() {
  const merchant = await getMerchant();
  const policy = await getCommercePolicy();
  const products = await getProducts();

  return (
    <main className="flex-grow pt-24 pb-xl px-md md:px-xl max-w-5xl mx-auto w-full flex flex-col gap-lg">
      <div className="flex items-center gap-md">
        <div className="w-14 h-14 rounded-xl bg-primary-container/20 flex items-center justify-center shrink-0">
          <MaterialIcon icon="store" className="text-primary" size={28} />
        </div>
        <div>
          <h1 className="text-headline-lg text-on-background">
            {merchant.name}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Merchant ID: {merchant.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <div className="glass-panel rounded-xl p-lg">
          <span className="text-label-caps text-on-surface-variant">
            Currency
          </span>
          <div className="text-headline-md text-on-surface mt-xs">
            {merchant.currency}
          </div>
        </div>
        <div className="glass-panel rounded-xl p-lg">
          <span className="text-label-caps text-on-surface-variant">
            Catalog size
          </span>
          <div className="text-headline-md text-on-surface mt-xs">
            {products.length} products
          </div>
        </div>
        <div className="glass-panel rounded-xl p-lg">
          <span className="text-label-caps text-on-surface-variant">
            Max order amount
          </span>
          <div className="text-headline-md text-on-surface mt-xs">
            {policy.maxPurchaseFormatted}
          </div>
        </div>
      </div>

      <section className="glass-panel rounded-xl p-lg">
        <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-md">
          Catalog
        </h2>
        <div className="flex flex-col gap-sm">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-sm border-b border-outline-variant/50 last:border-0"
            >
              <div className="flex flex-col">
                <span className="text-body-md text-on-surface">
                  {p.name}
                </span>
                <span className="text-code-sm text-on-surface-variant">
                  {p.category}
                </span>
              </div>
              <div className="flex items-center gap-md">
                <span className="text-body-md text-on-surface">
                  {p.priceFormatted}
                </span>
                <span
                  className={`text-label-caps ${
                    p.inStock ? "text-secondary" : "text-error"
                  }`}
                >
                  {p.inStock ? "In stock" : "Out of stock"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
