import AuditTimeline from "@/components/AuditTimeline";
import { getLatestOrder, getAuditEvents, getActivitySummary } from "@/lib/api";

export default async function ActivityPage() {
  const order = await getLatestOrder();
  const sessionId = order.session_id;
  const activityEvents = await getAuditEvents(sessionId);
  const activitySummary = await getActivitySummary(sessionId);

  return (
    <main className="flex-grow px-md md:px-lg w-full flex flex-col md:h-[calc(100vh-8rem)] md:overflow-hidden">
      <AuditTimeline
        events={activityEvents}
        summary={activitySummary}
        sessionId={sessionId}
        orderStatus={order.status}
      />
    </main>
  );
}
