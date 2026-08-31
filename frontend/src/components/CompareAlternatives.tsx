"use client";

import { useState } from "react";
import Link from "next/link";
import MaterialIcon from "./MaterialIcon";
import { Product } from "@/lib/api";

interface CompareAlternativesProps {
  products: Product[];
  triggerStyle?: "primary" | "secondary";
  triggerText?: string;
  triggerClassName?: string;
}

export default function CompareAlternatives({
  products,
  triggerStyle = "secondary",
  triggerText = "Compare Alternatives",
  triggerClassName,
}: CompareAlternativesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const defaultClassName =
    triggerStyle === "primary"
      ? "btn-primary flex-1 py-sm rounded-lg text-body-md font-medium text-center"
      : "btn-secondary flex-1 py-sm rounded-lg text-body-md font-medium text-center hover:bg-surface-container-high transition-colors";

  return (
    <>
      <button
        onClick={handleOpen}
        className={triggerClassName || defaultClassName}
      >
        {triggerStyle === "secondary" && !triggerClassName && (
          <MaterialIcon icon="compare_arrows" className="inline-block mr-2 text-sm" />
        )}
        {triggerClassName?.includes("compare_arrows") || triggerClassName ? null : ""}
        {triggerClassName && triggerClassName.includes("flex") ? (
          <>
            <MaterialIcon icon="compare_arrows" />
            {triggerText}
          </>
        ) : (
          triggerText
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative animate-scale-up">
            
            {/* Header */}
            <div className="sticky top-0 bg-surface-container-low z-10 p-lg border-b border-outline-variant flex justify-between items-center">
              <h2 className="text-headline-md text-on-surface flex items-center gap-sm">
                <MaterialIcon icon="compare" className="text-primary" />
                Compare Alternatives
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                <MaterialIcon icon="close" />
              </button>
            </div>

            {/* Comparison Table */}
            <div className="p-lg overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="p-md border-b border-outline-variant w-1/4">Feature</th>
                    {products.map((p) => (
                      <th key={p.id} className="p-md border-b border-outline-variant w-1/4 align-top">
                        <div className="flex flex-col gap-xs">
                          <span className="text-headline-md text-on-surface">{p.name}</span>
                          <span className="text-body-lg text-primary">{p.priceFormatted}</span>
                          <span className="text-label-caps bg-secondary/10 text-secondary w-max px-2 py-1 rounded-sm mt-xs">
                            {p.matchPercent}% Match
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-body-md text-on-surface-variant">
                  <tr className="border-b border-outline-variant/30">
                    <td className="p-md font-medium text-on-surface">RAM</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-md">{p.ram}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-outline-variant/30">
                    <td className="p-md font-medium text-on-surface">Storage</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-md">{p.ssd}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-outline-variant/30">
                    <td className="p-md font-medium text-on-surface">GPU</td>
                    {products.map((p) => (
                      <td key={p.id} className="p-md">{p.gpu}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-md"></td>
                    {products.map((p) => (
                      <td key={p.id} className="p-md pt-lg">
                        <Link
                          href={
                            p.matchPercent > 0
                              ? `/products/${p.id}?match=${p.matchPercent}`
                              : `/products/${p.id}`
                          }
                          onClick={handleClose}
                          className="btn-primary w-full block text-center py-2 rounded-md text-label-caps"
                        >
                          Select
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
