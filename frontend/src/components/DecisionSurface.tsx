interface DecisionSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The few surfaces per screen where the user is looking at a price, a
 * recommendation, or an action that moves money. More air, a restrained
 * top accent — should visually outrank the LedgerSurfaces around it.
 */
export default function DecisionSurface({ children, className = "" }: DecisionSurfaceProps) {
  return <div className={`decision-surface ${className}`}>{children}</div>;
}
