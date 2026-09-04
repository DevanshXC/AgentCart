"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MaterialIcon from "./MaterialIcon";

const navItems = [
  { icon: "shopping_cart", label: "AI Buyer", route: "/buyer" },
  { icon: "receipt_long", label: "Orders", route: "/payment" },
  { icon: "store", label: "Merchant", route: "/merchant" },
  { icon: "history", label: "Audit Trail", route: "/activity" },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Determine active state mapping
  const getActiveState = (route: string) => {
    if (pathname.startsWith("/buyer") || pathname.startsWith("/products") || pathname.startsWith("/authorize")) {
      return route === "/buyer";
    }
    if (pathname.startsWith("/payment") || pathname.startsWith("/recovery")) {
      return route === "/payment";
    }
    if (pathname.startsWith("/activity")) {
      return route === "/activity";
    }
    return pathname.startsWith(route);
  };

  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low flex flex-col z-50">
      <div className="px-lg py-md h-16 flex items-center gap-sm">
        <Link href="/buyer" className="flex items-center gap-sm">
          <span className="w-7 h-7 rounded-md bg-primary-container/15 border border-primary-container/30 flex items-center justify-center shrink-0">
            <MaterialIcon icon="receipt_long" size={16} className="text-primary" />
          </span>
          <span className="text-headline-md font-bold text-on-surface tracking-tight">
            AgentCart
          </span>
        </Link>
        <span className="text-label-caps text-on-surface-variant/50 ml-auto">AI</span>
      </div>
      
      <nav className="flex-1 flex flex-col gap-xs px-sm mt-sm">
        {navItems.map((item) => {
          const isActive = getActiveState(item.route);
          return (
            <Link
              key={item.label}
              href={item.route}
              className={`flex items-center gap-md px-md py-2.5 rounded-lg transition-colors duration-200 ${
                isActive
                  ? "text-primary bg-primary-container/10"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50"
              }`}
            >
              <MaterialIcon icon={item.icon} size={20} />
              <span className="text-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-sm pb-lg flex flex-col gap-sm">
        <Link
          href="/settings"
          className={`flex items-center gap-md px-md py-2.5 rounded-lg transition-colors duration-200 ${
            isSettingsActive
              ? "text-primary bg-primary-container/10"
              : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50"
          }`}
        >
          <MaterialIcon icon="settings" size={20} />
          <span className="text-body-md">Settings</span>
        </Link>
        <div className="px-md mt-sm">
          <div className="flex items-center gap-sm px-3 py-1.5 w-max">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse-dot" />
            <span className="text-label-caps text-on-surface-variant">
              AI AGENT READY
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
