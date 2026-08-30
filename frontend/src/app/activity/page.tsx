
import MaterialIcon from "@/components/MaterialIcon";
import {
  getLatestOrder,
  getAuditEvents,
  getActivitySummary,
  getActivityDetails
} from "@/lib/api";



const filterTabs = ["All", "Agent", "Policy", "Order", "Payment"];

export default async function ActivityPage() {
  const order = await getLatestOrder();
  const sessionId = order.session_id;
  const activityEvents = await getAuditEvents(sessionId);
  const activitySummary = await getActivitySummary(sessionId);
  const { policyCheckDetail, financialSafety, agentPermissions } = await getActivityDetails();

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

          {/* Main Content: Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
            {/* Left: Timeline */}
            <div className="lg:col-span-2 flex flex-col gap-md">
              {/* Filters */}
              <div className="flex flex-wrap gap-sm mb-sm">
                {filterTabs.map((tab, i) => (
                  <button
                    key={tab}
                    className={`px-3 py-1.5 rounded-full text-label-caps transition-all ${
                      i === 0
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-transparent border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Timeline Container */}
              <div className="glass-panel rounded-lg p-lg relative overflow-hidden">
                <div className="absolute left-[43px] top-lg bottom-lg w-px bg-outline-variant z-0" />
                <div className="flex flex-col gap-lg relative z-10">
                  {activityEvents.map((event: import("@/lib/api/types").AuditEvent, i: number) => {
                    const delay = (i + 1) * 100;
                    const delayClass = delay <= 500 ? `delay-${delay}` : 'delay-500';
                    return (
                    <div key={i} className={`flex gap-md group animate-fade-in-up ${delayClass} ${event.isHighlighted ? "cursor-pointer" : ""}`}>
                      <div className="w-[60px] flex-shrink-0 text-right pt-1">
                        <span
                          className={`text-code-sm group-hover:text-on-surface transition-colors ${
                            event.isHighlighted
                              ? "text-primary"
                              : "text-on-surface-variant"
                          }`}
                          style={
                            event.isHighlighted
                              ? { textShadow: "0 0 10px rgba(0, 82, 255, 0.5)" }
                              : undefined
                          }
                        >
                          {event.time}
                        </span>
                      </div>
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full bg-surface-container-high border-2 border-surface flex items-center justify-center mt-0.5 z-10 ${
                          event.isHighlighted
                            ? "shadow-[0_0_10px_rgba(0,82,255,0.5)]"
                            : ""
                        }`}
                      >
                        <div
                          className={`${
                            event.isHighlighted ? "w-2.5 h-2.5" : "w-2 h-2"
                          } rounded-full ${event.dotColor} group-hover:bg-on-surface transition-colors`}
                        />
                      </div>
                      {event.isHighlighted ? (
                        <div className="flex-1 bg-surface-container-high rounded-md p-md -mt-3 -ml-2 hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-sm mb-xs">
                            <span className="text-label-caps text-primary">
                              {event.type}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                            {event.status && (
                              <span className="text-label-caps text-secondary ml-auto">
                                {event.status}
                              </span>
                            )}
                          </div>
                          <p className="text-body-md text-on-surface">
                            {event.description}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 pb-md">
                          <div className="flex items-center gap-sm mb-xs">
                            <span className="text-label-caps text-on-surface">
                              {event.type}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                          </div>
                          <p className="text-body-md text-on-surface-variant">
                            {event.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            </div>

            {/* Right: Detail View */}
            <div className="lg:col-span-1 animate-fade-in-up delay-300">
              <div className="glass-panel rounded-lg p-lg sticky top-24">
                <div className="flex justify-between items-start mb-lg pb-md">
                  <div>
                    <span className="text-label-caps text-on-surface-variant mb-xs block">
                      Event Detail
                    </span>
                    <h3 className="text-headline-md text-on-surface">
                      POLICY CHECK
                    </h3>
                  </div>
                  <div className="px-2 py-1 bg-secondary/10 border border-secondary/30 rounded-sm text-secondary text-label-caps">
                    PASSED
                  </div>
                </div>
                <div className="space-y-md mb-lg">
                  <div className="grid grid-cols-2 gap-sm">
                    <span className="text-body-md text-on-surface-variant">
                      Order Amount
                    </span>
                    <span className="text-code-sm text-on-surface text-right">
                      {policyCheckDetail.orderAmount}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-sm">
                    <span className="text-body-md text-on-surface-variant">
                      Maximum Allowed
                    </span>
                    <span className="text-code-sm text-on-surface text-right">
                      {policyCheckDetail.maximumAllowed}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-sm">
                    <span className="text-body-md text-on-surface-variant">
                      Policy Source
                    </span>
                    <span className="text-body-md text-on-surface text-right truncate">
                      {policyCheckDetail.policySource}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-sm pt-sm">
                    <span className="text-body-md text-on-surface-variant">
                      Decision
                    </span>
                    <span className="text-label-caps text-on-surface text-right">
                      {policyCheckDetail.decision}
                    </span>
                  </div>
                </div>
                <div className="mb-lg">
                  <span className="text-label-caps text-on-surface-variant mb-sm block">
                    Event Payload
                  </span>
                  <div className="code-block rounded-md p-md text-xs overflow-x-auto">
                    <pre>
                      <code>{policyCheckDetail.payload}</code>
                    </pre>
                  </div>
                </div>
                <button className="w-full bg-transparent text-on-surface-variant rounded-lg py-2 text-body-md hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 active:scale-95">
                  View structured event
                </button>
              </div>
            </div>
          </div>

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
