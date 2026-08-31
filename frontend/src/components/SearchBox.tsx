"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MaterialIcon from "./MaterialIcon";
import { searchProducts, Product } from "@/lib/api";

export default function SearchBox() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const loading = query.trim() !== "" && searchedQuery !== query;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim()) return;
    const handle = setTimeout(() => {
      searchProducts(query)
        .then((products) => setResults(products.slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setSearchedQuery(query));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-on-surface-variant hover:text-primary transition-colors duration-200"
        aria-label="Search products"
      >
        <MaterialIcon icon="search" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-sm w-72 popover-panel rounded-lg p-sm z-50 animate-fade-in">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-surface-container rounded-md px-3 py-2 text-body-md text-on-background placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary-container"
          />
          <div className="mt-sm max-h-72 overflow-y-auto flex flex-col gap-xs">
            {loading && (
              <div className="text-code-sm text-on-surface-variant px-2 py-2">
                Searching…
              </div>
            )}
            {!loading && query.trim() && results.length === 0 && (
              <div className="text-code-sm text-on-surface-variant px-2 py-2">
                No products found.
              </div>
            )}
            {!loading &&
              query.trim() &&
              results.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-sm p-2 rounded-md hover:bg-surface-container-high transition-colors"
                >
                  <div className="w-9 h-9 rounded-sm bg-surface-container flex items-center justify-center border border-outline-variant shrink-0 overflow-hidden">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MaterialIcon
                        icon="laptop"
                        size={18}
                        className="text-on-surface-variant"
                      />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-body-md text-on-surface truncate">
                      {p.name}
                    </span>
                    <span className="text-code-sm text-on-surface-variant">
                      {p.priceFormatted}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
