"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MaterialIcon from "./MaterialIcon";
import NotificationsPopover from "./NotificationsPopover";
import { getUserAvatar, getRecentNotifications, AuditEvent } from "@/lib/api";

const navItems = [
  { icon: "shopping_cart", label: "AI Buyer", route: "/buyer" },
  { icon: "receipt_long", label: "Orders", route: "/payment" },
  { icon: "store", label: "Merchant", route: "/merchant" },
  { icon: "history", label: "Audit Trail", route: "/activity" },
  { icon: "settings", label: "Settings", route: "/settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("/assets/avatar.png");
  const [notifications, setNotifications] = useState<AuditEvent[]>([]);

  useEffect(() => {
    getUserAvatar().then(setUserAvatar).catch(() => {});
    getRecentNotifications().then(setNotifications).catch(() => {});
  }, []);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto px-md sm:px-lg h-full flex items-center justify-between gap-md">
        {/* Brand Logo */}
        <div className="flex items-center gap-lg shrink-0">
          <Link href="/buyer" className="flex items-center gap-sm group">
            <span className="w-8 h-8 rounded-lg bg-primary-container/20 border border-primary-container/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
              <MaterialIcon icon="receipt_long" size={18} className="text-primary" />
            </span>
            <span className="text-headline-md font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors duration-200">
              AgentCart
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-container/20 text-primary border border-primary-container/30 uppercase tracking-wider ml-1">
              AI
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-xs ml-4">
            {navItems.map((item) => {
              const isActive = getActiveState(item.route);
              return (
                <Link
                  key={item.label}
                  href={item.route}
                  className={`flex items-center gap-xs px-3 py-1.5 rounded-lg text-body-md font-medium transition-all duration-200 ${
                    isActive
                      ? "text-primary bg-primary-container/15 shadow-sm shadow-primary/10 border border-primary/20"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 border border-transparent"
                  }`}
                >
                  <MaterialIcon icon={item.icon} size={18} className={isActive ? "text-primary" : "text-on-surface-variant/70"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Status, Notifications, Avatar */}
        <div className="flex items-center gap-md sm:gap-lg">
          {/* Agent Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-white/5">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse-dot" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant font-medium">
              AI Agent Ready
            </span>
          </div>

          {/* Notifications */}
          <NotificationsPopover items={notifications} />

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden cursor-pointer ring-1 ring-white/10 hover:ring-2 hover:ring-primary/40 transition-all duration-200 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={userAvatar}
              alt="User profile"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            aria-label="Toggle Navigation"
          >
            <MaterialIcon icon={mobileMenuOpen ? "close" : "menu"} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-container-low border-b border-white/10 px-md py-sm flex flex-col gap-xs animate-fade-in">
          {navItems.map((item) => {
            const isActive = getActiveState(item.route);
            return (
              <Link
                key={item.label}
                href={item.route}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-md px-md py-2.5 rounded-lg text-body-md transition-colors ${
                  isActive
                    ? "text-primary bg-primary-container/15 font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <MaterialIcon icon={item.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="flex items-center gap-2 px-md py-2 mt-2 border-t border-white/5">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse-dot" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant">
              AI Agent Ready
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
