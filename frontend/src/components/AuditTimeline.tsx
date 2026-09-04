"use client";

import { Fragment, useMemo, useState } from "react";
import { AuditEvent, ActivitySummary } from "@/lib/api";

type FilterKey = "all" | "agent" | "policy" | "order" | "payment";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "agent", label: "AGENT" },
  { key: "policy", label: "POLICY" },
  { key: "order", label: "ORDER" },
  { key: "payment", label: "PAYMENT" },
];

const PAYMENT_EVENT_TYPES = new Set(["PAYMENT_VERIFY", "WEBHOOK_RECEIVED", "RECOVERY_COMPLETED"]);

/**
 * Real-data categorization, grounded in what the backend actually records:
 * - Agent: the agent's own automated preparation step (ORDER_PREVIEW).
 * - Policy: any event that carries a recorded policy_result, whichever event_type it is.
 * - Order: the order/Razorpay-order lifecycle transition (ORDER_AUTHORIZE).
 * - Payment: payment verification, webhook, and recovery/reconciliation events.
 */
function matchesFilter(event: AuditEvent, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "agent") return event.event_type === "ORDER_PREVIEW";
  if (filter === "policy") return !!event.policy_result;
  if (filter === "order") return event.event_type === "ORDER_AUTHORIZE";
  if (filter === "payment") return !!event.event_type && PAYMENT_EVENT_TYPES.has(event.event_type);
  return true;
}

function eventKey(event: AuditEvent, index: number): string {
  return event.id ?? `idx-${index}`;
}

function formatTimestamp(event: AuditEvent): string {
  if (event.timestamp) {
    const d = new Date(event.timestamp);
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
  return event.time;
}

/** Electric mint for pass/authorize states, sharp red for failure states, muted gray otherwise. */
function statusColor(status: string | null | undefined): string {
  if (!status) return "text-on-surface-variant/50";
  const s = status.toUpperCase();
  if (s.includes("FAIL") || s.includes("ERROR") || s.includes("DECLINE")) return "text-red-500";
  if (
    s.includes("PASS") ||
    s.includes("AUTHORIZ") ||
    s.includes("SUCCESS") ||
    s.includes("COMPLET") ||
    s.includes("VERIFIED") ||
    s.includes("SECURE")
  ) {
    return "text-secondary";
  }
  return "text-on-surface-variant";
}

/** Same keyword logic as statusColor, but for ordinary data values — falls back
 * to stark white instead of a dimmed gray, since these are real populated data. */
function valueColor(value: string): string {
  const s = value.toUpperCase();
  if (s.includes("FAIL") || s.includes("ERROR") || s.includes("DECLINE")) return "text-red-500";
  if (s.includes("PASS") || s.includes("AUTHORIZ") || s.includes("SUCCESS") || s.includes("COMPLET")) {
    return "text-secondary";
  }
  return "text-white";
}

function EventDetailPanel({ event }: { event: AuditEvent }) {
  const [showRaw, setShowRaw] = useState(false);

  const rawPayload = {
    id: event.id,
    event_type: event.event_type,
    action: event.action,
    actor: event.actor,
    result: event.result,
    policy_result: event.policy_result,
    order_id: event.order_id,
    session_id: event.session_id,
    provider_event_id: event.provider_event_id,
    input_data: event.input_data ?? null,
    output_data: event.output_data ?? null,
  };

  const rows: [string, string][] = [
    ["ACTION", event.action || "—"],
    ["ACTOR", event.actor || "—"],
    ["RESULT", event.result || "—"],
    ["TIMESTAMP", formatTimestamp(event)],
    ...(event.order_id ? ([["ORDER", event.order_id]] as [string, string][]) : []),
    ...(event.session_id ? ([["SESSION", event.session_id]] as [string, string][]) : []),
    ...(event.policy_result ? ([["POLICY_RESULT", event.policy_result]] as [string, string][]) : []),
  ];

  return (
    <div className="flex flex-col md:h-full md:min-h-0 font-mono">
      {/* Header — fixed */}
      <div className="shrink-0 flex items-start justify-between gap-md pb-md border-b border-white/10">
        <div className="min-w-0">
          <span className="text-xs text-on-surface-variant/40 block mb-xs">EVENT_DETAIL</span>
          <h3 className="text-lg text-white truncate" title={event.type}>
            {event.type}
          </h3>
        </div>
        {event.status && (
          <span className={`text-sm shrink-0 ${statusColor(event.status)}`}>[ {event.status} ]</span>
        )}
      </div>

      {/* Scrollable payload area */}
      <div className="flex-1 md:min-h-0 md:overflow-y-auto scrollbar-hide pt-md flex flex-col gap-md">
        <div className="bg-black border border-white/10 p-md">
          <div className="grid grid-cols-[auto_1fr] gap-x-lg gap-y-xs text-sm">
            {rows.map(([label, value]) => (
              <Fragment key={label}>
                <span className="text-on-surface-variant/50">{label}</span>
                <span className={`text-right tabular-nums truncate ${valueColor(value)}`} title={value}>
                  {value}
                </span>
              </Fragment>
            ))}
          </div>
        </div>

        <p className="text-sm text-on-surface-variant">{event.description}</p>

        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-on-surface-variant/50 hover:text-white text-left w-fit"
        >
          {showRaw ? "[-] HIDE_RAW_PAYLOAD" : "[+] SHOW_RAW_PAYLOAD"}
        </button>

        {showRaw && (
          <pre className="bg-black border border-white/10 p-md text-xs overflow-x-auto text-on-surface-variant">
            <code>{JSON.stringify(rawPayload, null, 2)}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

interface AuditTimelineProps {
  events: AuditEvent[];
  summary: ActivitySummary;
  sessionId?: string;
  orderStatus: string;
}

export default function AuditTimeline({ events, summary, sessionId, orderStatus }: AuditTimelineProps) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredEvents = useMemo(
    () => events.filter((e) => matchesFilter(e, filter)),
    [events, filter]
  );

  const defaultKey = filteredEvents.length > 0
    ? eventKey(filteredEvents[filteredEvents.length - 1], filteredEvents.length - 1)
    : undefined;

  const [selectedKey, setSelectedKey] = useState<string | undefined>(defaultKey);

  // Resolve the selected event within the currently filtered list, falling back
  // to the most recent event in that list if the prior selection filtered out.
  const selectedEvent = useMemo(() => {
    if (filteredEvents.length === 0) return undefined;
    const found = filteredEvents.find((e, i) => eventKey(e, i) === selectedKey);
    return found ?? filteredEvents[filteredEvents.length - 1];
  }, [filteredEvents, selectedKey]);

  const handleFilterChange = (key: FilterKey) => {
    setFilter(key);
    const nextFiltered = events.filter((e) => matchesFilter(e, key));
    setSelectedKey(
      nextFiltered.length > 0
        ? eventKey(nextFiltered[nextFiltered.length - 1], nextFiltered.length - 1)
        : undefined
    );
  };

  const orderStatusLabel = orderStatus === "PAID" ? "COMPLETED" : orderStatus;

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row md:h-full py-md md:py-lg">
      {/* Left: Event Timeline — 40% */}
      <div className="flex flex-col md:h-full md:min-h-0 md:w-2/5 md:border-r md:border-white/10 md:pr-lg font-mono">
        {/* Header: session/status, stats, filters — never scrolls */}
        <div className="shrink-0 bg-[var(--color-background)] pb-sm">
          <div className="flex items-center justify-between text-xs pb-sm">
            <span className="text-on-surface-variant/50 truncate" title={sessionId}>
              SESSION {sessionId ?? "—"}
            </span>
            <span className={`shrink-0 ${statusColor(orderStatusLabel)}`}>[ {orderStatusLabel} ]</span>
          </div>
          <div className="flex flex-wrap items-center gap-lg text-xs py-sm border-y border-white/10">
            <span className="text-on-surface-variant/50">
              EVENTS <span className="text-white tabular-nums">{summary.agentActions}</span>
            </span>
            <span className="text-on-surface-variant/50">
              POLICY <span className="text-white tabular-nums">{summary.policyChecks}</span>
            </span>
            <span className="text-on-surface-variant/50">
              FINANCIAL <span className="text-white tabular-nums">{summary.financialActions}</span>
            </span>
            <span className="text-on-surface-variant/50">
              RECOVERIES <span className="text-white tabular-nums">{summary.recoveries}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-xs pt-sm">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`px-sm py-xs text-xs ${
                  filter === f.key
                    ? "bg-white/10 text-white"
                    : "text-on-surface-variant/50 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable event list */}
        <div className="flex-1 md:min-h-0 md:overflow-y-auto scrollbar-hide flex flex-col">
          {filteredEvents.length === 0 ? (
            <p className="text-sm text-on-surface-variant/50 py-lg">No events match this filter.</p>
          ) : (
            filteredEvents.map((event, i) => {
              const key = eventKey(event, i);
              const isSelected = event === selectedEvent;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`flex items-baseline gap-sm px-sm py-xs text-left w-full text-sm hover:bg-zinc-800/50 border-l-2 ${
                    isSelected ? "bg-white/[0.06] border-primary" : "border-transparent"
                  }`}
                >
                  <span className="text-on-surface-variant/50 tabular-nums shrink-0">{event.time}</span>
                  <span className="text-white truncate flex-1">{event.type}</span>
                  {event.status && (
                    <span className={`shrink-0 text-xs ${statusColor(event.status)}`}>[ {event.status} ]</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Event Detail — 60% */}
      <div className="flex flex-col md:h-full md:min-h-0 md:w-3/5 md:pl-lg mt-lg md:mt-0">
        {selectedEvent ? (
          <EventDetailPanel event={selectedEvent} />
        ) : (
          <p className="text-sm text-on-surface-variant/50 font-mono">No event selected.</p>
        )}
      </div>
    </div>
  );
}
