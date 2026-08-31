
import MaterialIcon from "@/components/MaterialIcon";
import AuditTimeline from "@/components/AuditTimeline";
import {
  getLatestOrder,
  getAuditEvents,
  getActivitySummary,
  getActivityDetails
} from "@/lib/api";

export default async function ActivityPage() {
  const order = await getLatestOrder();
  const sessionId = order.session_id;
  const activityEvents = await getAuditEvents(sessionId);
  const activitySummary = await getActivitySummary(sessionId);
  const { financialSafety, agentPermissions } = await getActivityDetails();

  const summaryCards = [
    { label: "Agent Actions", value: activitySummary.agentActions, icon: "smart_toy" },
    { label: "Policy Checks", value: activitySummary.policyChecks, icon: "fact_check" },
    { label: "Financial Actions", value: activitySummary.financialActions, icon: "payments" },
    { label: "Recoveries", value: activitySummary.recoveries, icon: "build", dimmed: true },
  ];

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 p-md md:p-xl w-full max-w-[1280px] mx-auto relative z-10">
          {/* Breadcrumb & Header */}
          <div className="mb-lg">
            <div className="flex items-center gap-sm text-on-surface-variant mb-md">
              <span className="text-body-md hover:text-primary cursor-pointer transition-colors">
                Analytics
              </span>
              <MaterialIcon icon="chevron_right" size={16} />
              <span className="text-body-md text-on-surface">
                Activity / Audit Trail
              </span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
              <div>
                <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">
                  Agent Activity
                </h1>
                <p className="text-body-lg text-on-surface-variant max-w-2xl">
                  A transparent record of the actions, validations, and financial
                  events performed during your purchase.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-md">
                <div className="glass-panel px-4 py-2 rounded-md flex items-center gap-sm">
                  <MaterialIcon
                    icon="tag"
                    className="text-on-surface-variant"
                    size={16}
                  />
                  <span className="text-code-sm text-on-surface">
                    Session · {order.id}
                  </span>
                </div>
                <div className="glass-panel px-4 py-2 rounded-md flex items-center gap-sm border-secondary/30 bg-secondary/5">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-label-caps text-secondary">
                    Status: {order.status === "PAID" ? "COMPLETED" : order.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-lg">
            {summaryCards.map((card, idx) => {
              const delay = (idx + 1) * 100;
              const delayClass = delay <= 500 ? `delay-${delay}` : 'delay-500';
              return (
              <div
                key={card.label}
                className={`glass-panel p-md rounded-lg flex flex-col justify-between animate-fade-in-up ${delayClass} ${
                  card.dimmed ? "opacity-50" : ""
                }`}
              >
                <span className="text-label-caps text-on-surface-variant mb-md">
                  {card.label}
                </span>
                <div className="flex items-end justify-between">
                  <span className="text-headline-lg text-on-surface">
                    {card.value}
                  </span>
                  <MaterialIcon
                    icon={card.icon}
                    className="text-on-surface-variant"
                  />
                </div>
              </div>
            )})}
          </div>

          {/* Main Content: Timeline + Detail */}
          <AuditTimeline events={activityEvents} />

          {/* Bottom Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mt-lg pt-lg mb-lg">
            <div>
              <h4 className="text-headline-md text-on-surface mb-md">
                Financial Safety Summary
              </h4>
              <p className="text-body-md text-on-surface-variant mb-md">
                Financial controls enforced
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                {financialSafety.map((item: string) => (
                  <div key={item} className="flex items-start gap-sm">
                    <MaterialIcon
                      icon="check_circle"
                      className="text-secondary mt-0.5"
                      size={16}
                    />
                    <span className="text-body-md text-on-surface-variant text-sm">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-headline-md text-on-surface mb-md">
                Agent Permission Summary
              </h4>
              <p className="text-body-md text-on-surface-variant mb-md">
                Agent capabilities for this session
              </p>
              <div className="space-y-sm">
                <div className="flex gap-md items-start">
                  <span className="text-label-caps text-secondary w-20 flex-shrink-0 mt-1">
                    ALLOWED
                  </span>
                  <span className="text-body-md text-on-surface-variant text-sm">
                    {agentPermissions.allowed}
                  </span>
                </div>
                <div className="flex gap-md items-start">
                  <span className="text-label-caps text-error w-20 flex-shrink-0 mt-1">
                    RESTRICTED
                  </span>
                  <span className="text-body-md text-on-surface-variant text-sm">
                    {agentPermissions.restricted}
                  </span>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 text-center pt-md">
              <p className="text-body-md text-on-surface-variant/50">
                Every financial action is bounded, authorized, and auditable.
              </p>
            </div>
          </div>
      </main>
    </>
  );
}
