import MaterialIcon from "./MaterialIcon";

interface SafetyCheckProps {
  label: string;
  detail: string;
}

export default function SafetyCheck({ label, detail }: SafetyCheckProps) {
  return (
    <div className="flex items-start gap-sm p-sm rounded-sm bg-surface-container border border-border-base">
      <MaterialIcon icon="check_circle" fill className="text-secondary" />
      <div className="flex flex-col">
        <span className="text-code-sm text-on-background">{label}</span>
        <span className="text-code-sm text-on-surface-variant">{detail}</span>
      </div>
    </div>
  );
}
