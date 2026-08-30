import { AuditEvent, AgentEvent, ActivitySummary } from "./types";
import { activityEvents as mockActivityEvents, agentSteps, activitySummary as mockActivitySummary } from "@/lib/mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Maps a backend AuditEventResponse into the frontend AuditEvent shape
 * used by the Activity timeline UI.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendAuditEvent(event: any): AuditEvent {
  const ts = new Date(event.timestamp);
  const time = ts.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Derive a user-friendly type label
  let type = event.event_type;
  if (event.event_type === "ORDER_PREVIEW") type = "ORDER PREVIEW";
  else if (event.event_type === "ORDER_AUTHORIZE") type = "ORDER AUTHORIZE";
  else if (event.event_type === "PAYMENT_VERIFY") type = "PAYMENT VERIFY";
  else if (event.event_type === "WEBHOOK_RECEIVED") type = "WEBHOOK";
  else if (event.event_type === "RECOVERY_COMPLETED") type = "RECOVERY";

  // Derive a human-readable description
  let description = `${event.action} — ${event.result}`;
  if (event.event_type === "ORDER_PREVIEW" && event.action === "CREATE_PREVIEW") {
    description = "Order preview created. Price and inventory validated.";
  } else if (event.event_type === "ORDER_AUTHORIZE" && event.action === "CREATE_RAZORPAY_ORDER") {
    if (event.result === "SUCCESS") {
      description = "Order authorized. Razorpay payment order created.";
    } else {
      description = "Order authorization failed.";
    }
  } else if (event.event_type === "PAYMENT_VERIFY" && event.action === "CHECKOUT_SIGNATURE_VERIFY") {
    if (event.result === "SUCCESS") {
      description = "Razorpay checkout signature verified. Payment confirmed.";
    } else {
      description = "Checkout signature verification failed.";
    }
  } else if (event.event_type === "WEBHOOK_RECEIVED") {
    if (event.action === "payment.authorized") {
      description = "Razorpay webhook: payment.authorized received.";
    } else if (event.action === "payment.captured") {
      description = "Razorpay webhook: payment.captured received.";
    } else if (event.action === "payment.failed") {
      description = "Razorpay webhook: payment.failed received.";
    } else if (event.action === "order.paid") {
      description = `Razorpay webhook: ${event.action} received.`;
    } else {
      description = `Razorpay webhook: ${event.action} received.`;
    }
  } else if (event.event_type === "RECOVERY_COMPLETED") {
    description = "Payment state reconciled with Razorpay.";
  }

  // Determine dot color and highlighting
  let dotColor = "bg-on-surface-variant";
  let isHighlighted = false;
  let status: string | null = null;

  if (event.event_type === "WEBHOOK_RECEIVED") {
    dotColor = "bg-primary";
    isHighlighted = true;
    status = event.result;
  } else if (event.event_type === "PAYMENT_VERIFY") {
    dotColor = "bg-primary";
    isHighlighted = true;
    status = event.result === "SUCCESS" ? "VERIFIED" : "FAILED";
  } else if (event.event_type === "ORDER_AUTHORIZE" && event.result === "SUCCESS") {
    dotColor = "bg-primary";
    isHighlighted = true;
    status = "AUTHORIZED";
  } else if (event.result === "FAILURE") {
    dotColor = "bg-error";
  }

  return {
    time,
    type,
    description,
    dotColor,
    status,
    isHighlighted,
  };
}

export async function getAuditEvents(sessionId?: string): Promise<AuditEvent[]> {
  if (!sessionId) return mockActivityEvents;
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/audit/${sessionId}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        // Backend returns newest-first; reverse for chronological timeline display
        const sorted = [...data].sort(
          (a: { timestamp: string }, b: { timestamp: string }) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return sorted.map(mapBackendAuditEvent);
      }
    }
  } catch {
    console.error("Failed to fetch audit events from backend, falling back to mock data");
  }
  return mockActivityEvents;
}

export async function getAgentActivity(): Promise<AgentEvent[]> {
  return agentSteps;
}

export async function getActivitySummary(sessionId?: string): Promise<ActivitySummary> {
  if (!sessionId) return mockActivitySummary;
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/audit/${sessionId}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        // Compute summary from real events
        let agentActions = 0;
        let policyChecks = 0;
        let financialActions = 0;
        let recoveries = 0;

        for (const event of data) {
          if (event.event_type === "ORDER_PREVIEW" || event.event_type === "ORDER_AUTHORIZE") {
            agentActions++;
          }
          if (event.policy_result) {
            policyChecks++;
          }
          if (event.event_type === "PAYMENT_VERIFY" || event.event_type === "WEBHOOK_RECEIVED") {
            financialActions++;
          }
          if (event.event_type === "RECOVERY_COMPLETED") {
            recoveries++;
          }
        }

        return { agentActions, policyChecks, financialActions, recoveries };
      }
    }
  } catch {
    console.error("Failed to compute activity summary from backend, falling back to mock data");
  }
  return mockActivitySummary;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getActivityEvent(_id: string): Promise<AuditEvent> {
  return mockActivityEvents[0];
}
