"use client";

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "./MaterialIcon";

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Renders a product photo that fills its container edge-to-edge (cropping
 * as needed), or the standard laptop placeholder when there's no usable image.
 *
 * Sizing note: a plain `<img className="w-full ...">` inside a `flex`
 * container can collapse to a tiny rendered size — percentage widths on a
 * replaced element resolve against the flex item's own hypothetical/content
 * size, not the container, in some browser flex-sizing paths. Positioning
 * the image with `absolute inset-0` sidesteps that: its width/height resolve
 * directly against the containing block (this component's own relative
 * wrapper), which is a plain, well-defined percentage calculation.
 */
export default function ProductImage({ src, alt, className = "", children }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // SSR hydration race guard: the server renders the <img> before React
    // attaches the onError listener. A fast-failing image can dispatch its
    // native "error" event during that gap, so it's never observed by
    // onError. Once mounted, check whether it already settled into a
    // failed state (complete, but no natural size) and fall back manually.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [src]);

  const showPlaceholder = !src || failed;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <MaterialIcon icon="laptop" size={64} className="text-on-surface-variant opacity-20" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      {children}
    </div>
  );
}
