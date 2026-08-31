"use client";

import { useMemo, useState } from "react";
import MaterialIcon from "./MaterialIcon";
import { Accessory } from "@/lib/api";

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function AccessoriesPanel({ accessories }: { accessories: Accessory[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const subtotal = useMemo(
    () =>
      accessories
        .filter((acc) => selectedIds.has(acc.id))
        .reduce((sum, acc) => sum + acc.price, 0),
    [accessories, selectedIds]
  );

  return (
    <div className="flex flex-col gap-sm">
      {accessories.map((acc) => {
        const isAdded = selectedIds.has(acc.id);
        return (
          <div
            key={acc.id}
            className="flex items-center justify-between p-sm rounded-lg hover:bg-surface-container-high transition-colors group"
          >
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 rounded-sm bg-surface-container flex items-center justify-center border border-outline-variant">
                <MaterialIcon
                  icon={acc.icon}
                  className="text-on-surface-variant"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-body-md text-on-surface">
                  {acc.name}
                </span>
                <span className="text-label-caps text-on-surface-variant">
                  {acc.priceFormatted}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle(acc.id)}
              aria-pressed={isAdded}
              className={`px-3 py-1.5 rounded-full text-label-caps whitespace-nowrap transition-colors ${
                isAdded
                  ? "bg-secondary/10 text-secondary border border-secondary/30"
                  : "text-primary hover:bg-primary/10 border border-transparent"
              }`}
            >
              {isAdded ? "Added ✓" : <MaterialIcon icon="add" size={18} />}
            </button>
          </div>
        );
      })}

      {selectedIds.size > 0 && (
        <div className="flex justify-between items-center px-sm py-sm mt-xs rounded-lg bg-surface-container">
          <span className="text-body-md text-on-surface-variant">
            {selectedIds.size} accessor{selectedIds.size === 1 ? "y" : "ies"} selected
          </span>
          <span className="text-body-md font-semibold text-on-surface">
            {formatPrice(subtotal)}
          </span>
        </div>
      )}
    </div>
  );
}
