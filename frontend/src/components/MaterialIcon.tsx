"use client";

import React from "react";

interface MaterialIconProps {
  icon: string;
  fill?: boolean;
  className?: string;
  size?: number;
}

export default function MaterialIcon({
  icon,
  fill = false,
  className = "",
  size,
}: MaterialIconProps) {
  const style: React.CSSProperties = {
    fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
  };
  if (size) {
    style.fontSize = `${size}px`;
  }
  return (
    <span className={`material-symbols-outlined ${className}`} style={style}>
      {icon}
    </span>
  );
}
