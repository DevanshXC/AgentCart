import MaterialIcon from "@/components/MaterialIcon";
import { getCommercePolicy, getMerchant } from "@/lib/api";

export default async function SettingsPage() {
  const policy = await getCommercePolicy();
  const merchant = await getMerchant().catch(() => null);

  const limits = [
    { label: "Maximum purchase", value: policy.maxPurchaseFormatted, icon: "payments" },
    { label: "Approval required above", value: policy.approvalAboveFormatted, icon: "verified_user" },
    { label: "Maximum discount", value: `${policy.maxDiscountPercent}%`, icon: "percent" },
    { label: "Remaining budget", value: policy.remainingBudgetFormatted, icon: "account_balance_wallet" },
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

      <section className="glass-panel rounded-xl p-lg">
        <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-md">
          Agent Financial Limits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          {limits.map((l) => (
            <div
              key={l.label}
              className="flex items-center justify-between p-md rounded-lg bg-surface-container border border-outline-variant"
            >
              <div className="flex items-center gap-sm">
                <MaterialIcon icon={l.icon} className="text-primary" size={20} />
                <span className="text-body-md text-on-surface-variant">
                  {l.label}
                </span>
              </div>
              <span className="text-body-lg font-semibold text-on-surface">
                {l.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {merchant && (
        <section className="glass-panel rounded-xl p-lg">
          <h2 className="text-label-caps text-on-surface-variant tracking-widest mb-md">
            Merchant
          </h2>
          <div className="flex flex-col gap-xs text-body-md text-on-surface-variant">
            <div className="flex justify-between">
              <span>Name</span>
              <span className="text-on-surface">{merchant.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Currency</span>
              <span className="text-on-surface">{merchant.currency}</span>
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
