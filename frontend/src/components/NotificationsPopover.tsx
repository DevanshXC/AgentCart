"use client";

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "./MaterialIcon";
import { AuditEvent } from "@/lib/api";

export default function NotificationsPopover({ items }: { items: AuditEvent[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-on-surface-variant hover:text-primary transition-colors duration-200 relative"
        aria-label="Notifications"
      >
        <MaterialIcon icon="notifications" />
        {items.length > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-sm w-80 popover-panel rounded-lg p-sm z-50 animate-fade-in">
          <div className="px-2 py-1.5 text-label-caps text-on-surface-variant tracking-widest">
            Recent activity
          </div>
          <div className="max-h-80 overflow-y-auto flex flex-col gap-xs">
            {items.length === 0 ? (
              <div className="text-body-md text-on-surface-variant px-2 py-4 text-center">
                No recent activity yet.
              </div>
            ) : (
              items.map((event, i) => (
                <div
                  key={i}
                  className="flex items-start gap-sm p-2 rounded-md hover:bg-surface-container-high transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${event.dotColor}`}
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-xs">
                      <span className="text-label-caps text-on-surface">
                        {event.type}
                      </span>
                      {event.status && (
                        <span className="text-label-caps text-secondary">
                          {event.status}
                        </span>
                      )}
                    </div>
                    <span className="text-body-md text-on-surface-variant truncate">
                      {event.description}
                    </span>
                    <span className="text-code-sm text-outline mt-xs">
                      {event.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
