interface StatusBadgeProps {
  label: string;
  color?: "green" | "blue" | "amber" | "neutral";
  icon?: string;
  dotOnly?: boolean;
}

export default function StatusBadge({
  label,
  color = "green",
  icon,
}: StatusBadgeProps) {
  const colorMap = {
    green: {
      bg: "bg-[#002113]",
      border: "border-[#005236]",
      text: "text-secondary",
      dot: "bg-secondary",
    },
    blue: {
      bg: "bg-primary/10",
      border: "border-primary/20",
      text: "text-primary",
      dot: "bg-primary",
    },
    amber: {
      bg: "bg-tertiary/10",
      border: "border-tertiary/20",
      text: "text-tertiary",
      dot: "bg-tertiary",
    },
    neutral: {
      bg: "bg-surface-container-high",
      border: "border-outline-variant",
      text: "text-on-surface",
      dot: "bg-on-surface",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={`flex items-center gap-xs ${c.bg} border ${c.border} px-md py-sm rounded-full`}
    >
      {icon ? (
        <span
          className={`material-symbols-outlined ${c.text} text-[20px]`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      ) : (
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      )}
      <span className={`text-label-caps ${c.text}`}>{label}</span>
    </div>
  );
}
