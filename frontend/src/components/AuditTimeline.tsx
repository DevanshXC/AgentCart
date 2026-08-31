"use client";

import { useMemo, useState } from "react";
import MaterialIcon from "./MaterialIcon";
import { AuditEvent } from "@/lib/api";

type FilterKey = "all" | "agent" | "policy" | "order" | "payment";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "agent", label: "Agent" },
  { key: "policy", label: "Policy" },
  { key: "order", label: "Order" },
  { key: "payment", label: "Payment" },
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

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-sm">
      <span className="text-body-md text-on-surface-variant">{label}</span>
      <span className={`text-right text-on-surface ${mono ? "text-code-sm" : "text-body-md"}`}>
        {value}
      </span>
    </div>
  );
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

  return (
    <div className="glass-panel rounded-lg p-lg sticky top-24">
      <div className="flex justify-between items-start mb-lg gap-sm">
        <div className="min-w-0">
          <span className="text-label-caps text-on-surface-variant mb-xs block">
            Event Detail
          </span>
          <h3 className="text-headline-md text-on-surface truncate" title={event.type}>
            {event.type}
          </h3>
        </div>
        {event.status && (
          <div className="px-2 py-1 bg-secondary/10 border border-secondary/30 rounded-sm text-secondary text-label-caps whitespace-nowrap">
            {event.status}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-sm mb-lg">
        <DetailRow label="Action" value={event.action || "—"} />
        <DetailRow label="Actor" value={event.actor || "—"} />
        <DetailRow label="Result" value={event.result || "—"} />
        <DetailRow label="Timestamp" value={formatTimestamp(event)} />
        {event.order_id && <DetailRow label="Order" value={event.order_id} mono />}
        {event.session_id && <DetailRow label="Session" value={event.session_id} mono />}
        {event.policy_result && <DetailRow label="Policy result" value={event.policy_result} />}
      </div>

      <p className="text-body-md text-on-surface-variant mb-lg">{event.description}</p>

      <button
        type="button"
        onClick={() => setShowRaw((v) => !v)}
        className="w-full flex items-center justify-between bg-transparent text-on-surface-variant rounded-lg py-2 text-body-md hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200"
      >
        <span>Technical details</span>
        <MaterialIcon icon={showRaw ? "expand_less" : "expand_more"} size={20} />
      </button>

      {showRaw && (
        <div className="code-block rounded-md p-md text-xs overflow-x-auto mt-sm">
          <pre>
            <code>{JSON.stringify(rawPayload, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AuditTimeline({ events }: { events: AuditEvent[] }) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
      {/* Left: Timeline */}
      <div className="lg:col-span-2 flex flex-col gap-md">
        {/* Filters */}
        <div className="flex flex-wrap gap-sm mb-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-full text-label-caps transition-all ${
                filter === f.key
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-transparent border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline Container */}
        <div className="glass-panel rounded-lg p-lg relative overflow-hidden">
          {filteredEvents.length === 0 ? (
            <p className="text-body-md text-on-surface-variant text-center py-lg">
              No events match this filter.
            </p>
          ) : (
            <>
              <div className="absolute left-[43px] top-lg bottom-lg w-px bg-outline-variant z-0" />
              <div className="flex flex-col gap-md relative z-10">
                {filteredEvents.map((event, i) => {
                  const key = eventKey(event, i);
                  const isSelected = event === selectedEvent;
                  const delay = (i + 1) * 100;
                  const delayClass = delay <= 500 ? `delay-${delay}` : "delay-500";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={`flex gap-md group text-left animate-fade-in-up ${delayClass} cursor-pointer rounded-md transition-colors ${
                        isSelected ? "bg-surface-container-high/70" : "hover:bg-surface-container-high/30"
                      }`}
                    >
                      <div className="w-[60px] flex-shrink-0 text-right pt-1 pl-md">
                        <span
                          className={`text-code-sm group-hover:text-on-surface transition-colors ${
                            event.isHighlighted ? "text-primary" : "text-on-surface-variant"
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
                        <div className="flex-1 bg-surface-container-high rounded-md p-sm pr-md">
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
                        <div className="flex-1 py-1 pr-md">
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
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Detail View */}
      <div className="lg:col-span-1 animate-fade-in-up delay-300">
        {selectedEvent ? (
          <EventDetailPanel event={selectedEvent} />
        ) : (
          <div className="glass-panel rounded-lg p-lg sticky top-24 text-center text-body-md text-on-surface-variant">
            No event selected.
          </div>
        )}
      </div>
    </div>
  );
}
