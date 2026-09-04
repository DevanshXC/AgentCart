import MaterialIcon from "./MaterialIcon";

interface AgentReasoningProps {
  reasons: string[];
  title?: string;
  icon?: string;
  className?: string;
}

/**
 * One recognizable visual treatment for "the agent is explaining itself" —
 * shared by every screen that surfaces the agent's own reasoning (Buyer's
 * match reasons, Product's "why chosen" panel), so the user learns to
 * recognize the agent's voice at a glance across pages.
 */
export default function AgentReasoning({
  reasons,
  title = "Why your agent chose this",
  icon = "auto_awesome",
  className = "",
}: AgentReasoningProps) {
  return (
    <div className={`agent-reasoning ${className}`}>
      <div className="flex items-center gap-sm mb-md">
        <MaterialIcon icon={icon} className="text-primary" size={18} />
        <h3 className="text-label-caps text-primary tracking-widest">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        {reasons.map((reason) => (
          <div key={reason} className="flex items-start gap-xs">
            <MaterialIcon icon="check" className="text-secondary shrink-0" size={16} />
            <span className="text-body-md text-on-surface-variant">{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
