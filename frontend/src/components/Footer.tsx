import MaterialIcon from "./MaterialIcon";
import { policy } from "@/lib/mock-data";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 md:left-64 right-0 z-40 bg-background/80 backdrop-blur-md px-lg py-sm flex flex-col md:flex-row justify-between items-center gap-sm">
      <div className="flex items-center gap-sm">
        <MaterialIcon icon="shield" className="text-on-surface-variant/50 text-sm" />
        <span className="text-label-caps text-on-surface-variant/60">
          Your agent operates within your limits
        </span>
      </div>
      <div className="flex items-center gap-lg text-label-caps text-on-surface-variant/50">
        <span className="hidden md:inline">Max purchase {policy.maxPurchaseFormatted}</span>
        <span className="hidden md:inline">Approval above {policy.approvalAboveFormatted}</span>
        <span className="hidden md:inline">Max discount {policy.maxDiscountPercent}%</span>
        <a
          href="#"
          className="btn-ghost hover:text-white transition-colors"
        >
          View policies
        </a>
      </div>
    </footer>
  );
}
