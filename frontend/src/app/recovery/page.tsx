import Link from "next/link";

import Breadcrumb from "@/components/Breadcrumb";
import StatusBadge from "@/components/StatusBadge";
import MaterialIcon from "@/components/MaterialIcon";
import { getRecoveryData, getLatestOrder, getAuditEvents } from "@/lib/api";

function formatEventTimestamp(timestamp?: string, fallback?: string): string {
  if (timestamp) {
    const d = new Date(timestamp);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }
  }
  return fallback ?? "—";
}

export default async function RecoveryPage() {
  const { recoveryTimeline, recoverySummary, recoveryExplanations } = await getRecoveryData();

  // Real backend data takes precedence: if this session has a genuine
  // RECOVERY_COMPLETED audit event, surface its real fields. Otherwise keep
  // the illustrative fallback above unchanged.
  const order = await getLatestOrder();
  const events = order.session_id ? await getAuditEvents(order.session_id) : [];
  const recoveryEvent = events.find((e) => e.event_type === "RECOVERY_COMPLETED");

  const summaryItems = recoveryEvent
    ? [
        { label: "Order", value: order.id, mono: true },
        {
          label: "Previous state",
          value: String(recoveryEvent.output_data?.previous_state ?? "UNKNOWN"),
        },
        {
          label: "New state",
          value: String(recoveryEvent.output_data?.new_state ?? "UNKNOWN"),
          valueColor: "text-secondary",
        },
        {
          label: "Reconciled at",
          value: formatEventTimestamp(recoveryEvent.timestamp, recoveryEvent.time),
          mono: true,
        },
        {
          label: "Gateway status",
          value: String(recoveryEvent.input_data?.rzp_status ?? "—"),
        },
      ]
    : recoverySummary;

  return (
    <>

      <main className="pt-[80px] pb-xl px-md md:px-xl max-w-[1280px] mx-auto w-full min-h-screen flex flex-col gap-xl">
        {/* Breadcrumbs */}
        <div className="pt-lg">
          <Breadcrumb
            items={[
              { label: "Payment", href: "/payment" },
              { label: "Recovery" },
            ]}
          />
        </div>

        {/* Hero */}
        <header className="flex flex-col gap-md">
          <div className="flex items-center gap-md flex-wrap">
            <StatusBadge
              label="RECOVERED"
              color="green"
              icon="check_circle"
            />
            <StatusBadge
              label="NO DUPLICATE CHARGE"
              color="neutral"
              icon="verified_user"
            />
          </div>
          <div>
            <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Payment state recovered
            </h1>
            <p className="text-body-lg text-on-surface-variant mt-sm max-w-2xl">
              Your transaction was reconciled safely. No duplicate charge was
              created during the recovery process.
            </p>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
          {/* Left: Timeline */}
          <div className="lg:col-span-7 glass-panel rounded-xl p-lg">
            <h2 className="text-headline-md text-on-surface mb-lg">
              Recovery Timeline
            </h2>
            <div className="relative pl-xl">
              <div className="absolute left-[11px] top-4 bottom-4 timeline-line-recovery" />
              <div className="flex flex-col gap-lg">
                {Array.isArray(recoveryTimeline) && recoveryTimeline.map((step: { type: string; label: string; detail?: string; time?: string }, i: number) => {
                  if (step.type === "critical") {
                    return (
                      <div
                        key={i}
                        className="relative bg-surface-container-high border border-outline-variant rounded-lg p-md ml-[-12px] mr-md z-20"
                      >
                        <div className="absolute -left-[23px] top-[18px] w-[14px] h-[14px] rounded-full bg-tertiary border-2 border-surface-dim z-10 shadow-[0_0_10px_rgba(255,185,95,0.5)]" />
                        <p className="text-body-md font-bold text-tertiary flex items-center gap-sm">
                          <MaterialIcon icon="warning" size={18} />
                          {step.label}
                        </p>
                        {step.detail && (
                          <p className="text-code-sm text-on-surface-variant mt-xs">
                            {step.detail}
                          </p>
                        )}
                      </div>
                    );
                  }

                  const dotColor =
                    step.type === "warning"
                      ? "bg-tertiary"
                      : "bg-secondary-container";
                  const textColor =
                    step.type === "warning"
                      ? "text-tertiary"
                      : step.type === "final"
                      ? "text-secondary font-bold"
                      : "text-on-surface";

                  return (
                    <div key={i} className="relative">
                      <div
                        className={`absolute -left-[35px] top-1 w-[14px] h-[14px] rounded-full ${dotColor} border-2 border-surface-dim z-10`}
                      />
                      <p className={`text-body-md ${textColor}`}>
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-code-sm text-on-surface-variant mt-xs">
                          {step.time}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Info & Safety */}
          <div className="lg:col-span-5 flex flex-col gap-lg">
            {/* Recovery Summary */}
            <div className="glass-panel rounded-xl p-lg">
              <h3 className="text-label-caps text-on-surface-variant mb-md">
                RECOVERY SUMMARY
              </h3>
              <div className="flex flex-col gap-md">
                {Array.isArray(summaryItems) && summaryItems.map((item: { label: string; value: string; valueColor?: string; mono?: boolean }, i: number) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center ${
                      i < summaryItems.length - 1
                        ? "border-b border-border-base pb-sm"
                        : ""
                    }`}
                  >
                    <span className="text-body-md text-on-surface-variant">
                      {item.label}
                    </span>
                    <span
                      className={`text-body-md ${
                        item.valueColor || "text-on-surface"
                      } ${item.mono ? "font-mono text-code-sm" : ""} text-right`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Why not duplicated */}
            <div className="glass-panel rounded-xl p-lg">
              <h3 className="text-body-md font-bold text-on-surface mb-md">
                Why your payment was not duplicated
              </h3>
              <ul className="flex flex-col gap-sm">
                {recoveryExplanations.map((explanation: string, i: number) => (
                  <li key={i} className="flex items-start gap-sm">
                    <MaterialIcon
                      icon="check"
                      className="text-secondary mt-xs"
                      size={18}
                    />
                    <span className="text-body-md text-on-surface-variant">
                      {explanation}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Agent Role */}
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-lg">
              <div className="flex items-center gap-sm mb-md">
                <MaterialIcon
                  icon="smart_toy"
                  className="text-primary-container"
                />
                <h3 className="text-label-caps text-on-surface">
                  AGENT ACTIVITY LOG
                </h3>
              </div>
              <p className="text-body-md text-on-surface-variant italic">
                &quot;Observed payment failure timeout. Requested direct
                reconciliation with gateway. Verified successful charge and
                locked state. Prevented duplicate retry attempt.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col items-center gap-md mt-xl pt-lg border-t border-border-base">
          <div className="flex gap-md w-full md:w-auto">
            <Link
              href="/activity"
              className="flex-1 md:flex-none btn-primary text-label-caps px-xl py-sm rounded-sm flex items-center justify-center gap-xs"
            >
              View Order
              <MaterialIcon icon="arrow_forward" size={16} />
            </Link>
            <Link
              href="/activity"
              className="flex-1 md:flex-none btn-secondary text-label-caps px-xl py-sm rounded-sm flex items-center justify-center"
            >
              View Agent Activity
            </Link>
          </div>
          <div className="flex items-center gap-xs text-on-surface-variant mt-sm">
            <MaterialIcon icon="shield" className="text-secondary" size={16} />
            <span className="text-body-md text-on-surface-variant">
              Your funds were protected during recovery.
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
