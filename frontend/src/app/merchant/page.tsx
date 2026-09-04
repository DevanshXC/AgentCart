import MaterialIcon from "@/components/MaterialIcon";
import LedgerSurface from "@/components/LedgerSurface";
import MoneyValue from "@/components/MoneyValue";
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

      <LedgerSurface className="rounded-lg">
        <div className="ledger-surface-row px-lg py-md">
          <span className="text-body-md text-on-surface-variant">Currency</span>
          <span className="text-body-lg text-on-surface font-medium">{merchant.currency}</span>
        </div>
        <div className="ledger-surface-row px-lg py-md">
          <span className="text-body-md text-on-surface-variant">Catalog size</span>
          <span className="text-body-lg text-on-surface font-medium">{products.length} products</span>
        </div>
        <div className="ledger-surface-row px-lg py-md">
          <span className="text-body-md text-on-surface-variant flex items-center gap-xs">
            <MaterialIcon icon="verified_user" size={16} className="text-primary" />
            Max order amount
          </span>
          <MoneyValue size="sm" className="text-on-surface">
            {policy.maxPurchaseFormatted}
          </MoneyValue>
        </div>
      </LedgerSurface>

      <section className="ledger-surface rounded-lg p-lg">
        <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-md">
          Catalog
        </h2>
        <div className="flex flex-col">
          {products.map((p) => (
            <div key={p.id} className="ledger-surface-row py-sm">
              <div className="flex flex-col">
                <span className="text-body-md text-on-surface">
                  {p.name}
                </span>
                <span className="text-code-sm text-on-surface-variant">
                  {p.category}
                </span>
              </div>
              <div className="flex items-center gap-md">
                <MoneyValue size="sm" className="text-on-surface">
                  {p.priceFormatted}
                </MoneyValue>
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
