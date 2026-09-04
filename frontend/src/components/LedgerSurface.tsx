interface LedgerSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Supporting/reference information — specs, history, policy values, catalog
 * rows. Flatter and denser than a DecisionSurface; should never compete
 * with it for attention.
 */
export default function LedgerSurface({ children, className = "" }: LedgerSurfaceProps) {
  return <div className={`ledger-surface ${className}`}>{children}</div>;
}
