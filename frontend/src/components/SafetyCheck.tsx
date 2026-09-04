import MaterialIcon from "./MaterialIcon";

interface SafetyCheckProps {
  label: string;
  detail: string;
  index?: number;
}

export default function SafetyCheck({ label, detail, index = 0 }: SafetyCheckProps) {
  return (
    <div
      className="flex items-center justify-between gap-sm min-w-0 animate-soft-reveal"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="flex items-center gap-sm min-w-0">
        <MaterialIcon icon="check" className="text-emerald-400 shrink-0" size={16} />
        <div className="flex flex-col min-w-0">
          <span className="text-body-md text-white truncate">{label}</span>
          <span className="text-xs text-on-surface-variant truncate">{detail}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold tracking-widest text-emerald-400 shrink-0">
        PASSED
      </span>
    </div>
  );
}
