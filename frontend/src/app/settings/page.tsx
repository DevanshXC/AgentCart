import MaterialIcon from "@/components/MaterialIcon";
import LedgerSurface from "@/components/LedgerSurface";
import MoneyValue from "@/components/MoneyValue";
import { getCommercePolicy, getMerchant } from "@/lib/api";

export default async function SettingsPage() {
  const policy = await getCommercePolicy();
  const merchant = await getMerchant().catch(() => null);

  const limits = [
    { label: "Maximum purchase", value: policy.maxPurchaseFormatted, icon: "payments", money: true },
    { label: "Approval required above", value: policy.approvalAboveFormatted, icon: "verified_user", money: true },
    { label: "Maximum discount", value: `${policy.maxDiscountPercent}%`, icon: "percent", money: false },
    { label: "Remaining budget", value: policy.remainingBudgetFormatted, icon: "account_balance_wallet", money: true },
  ];

  return (
    <main className="flex-grow pt-24 pb-xl px-md md:px-xl max-w-4xl mx-auto w-full flex flex-col gap-lg">
      <div>
        <h1 className="text-headline-lg text-on-background">Settings</h1>
        <p className="text-body-lg text-on-surface-variant mt-sm max-w-2xl">
          Your agent operates strictly within these merchant-defined limits.
          These values are read directly from the active commerce policy.
        </p>
      </div>

      <section className="flex flex-col gap-md">
        <h2 className="text-label-caps text-on-surface-variant tracking-widest">
          Agent Financial Limits
        </h2>
        <LedgerSurface className="rounded-lg">
          {limits.map((l) => (
            <div key={l.label} className="ledger-surface-row px-lg py-md">
              <div className="flex items-center gap-sm">
                <MaterialIcon icon={l.icon} className="text-primary" size={18} />
                <span className="text-body-md text-on-surface-variant">
                  {l.label}
                </span>
              </div>
              {l.money ? (
                <MoneyValue size="sm" className="text-on-surface">{l.value}</MoneyValue>
              ) : (
                <span className="text-body-lg font-semibold text-on-surface">{l.value}</span>
              )}
            </div>
          ))}
        </LedgerSurface>
      </section>

      {merchant && (
        <section className="flex flex-col gap-md">
          <h2 className="text-label-caps text-on-surface-variant/70 tracking-widest">
            Merchant
          </h2>
          <div className="flex flex-col gap-xs text-body-md text-on-surface-variant px-sm">
            <div className="flex justify-between">
              <span>Name</span>
              <span className="text-on-surface-variant">{merchant.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Currency</span>
              <span className="text-on-surface-variant">{merchant.currency}</span>
            </div>
          </div>
        </section>
      )}

      <p className="text-code-sm text-outline flex items-center gap-xs">
        <MaterialIcon icon="lock" size={16} />
        Policy limits are enforced server-side and cannot be changed by the agent.
      </p>
    </main>
  );
}
