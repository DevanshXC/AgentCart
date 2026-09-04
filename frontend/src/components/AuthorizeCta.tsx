"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import MaterialIcon from "./MaterialIcon";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

interface AuthorizeCtaProps {
  href: string;
  label: string;
}

/**
 * Purely a presentational/navigation affordance around the existing
 * `router.push` — identical to the `<Link>` it replaces. No Razorpay or
 * checkout logic lives here; that still runs exactly as before on the
 * destination route.
 */
export default function AuthorizeCta({ href, label }: AuthorizeCtaProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);

  const pending = clicked || isPending;

  const handleClick = () => {
    setClicked(true);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`relative w-full h-12 rounded-md bg-[var(--color-primary-container)] text-body-lg font-medium overflow-hidden transition-transform duration-300 ${EASE} active:scale-[0.98] disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-background`}
    >
      <span
        className={`absolute inset-0 flex items-center justify-center text-white transition-opacity duration-300 ${EASE} ${
          pending ? "opacity-0" : "opacity-100"
        }`}
      >
        {label}
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center text-white transition-opacity duration-300 ${EASE} ${
          pending ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!pending}
      >
        <MaterialIcon icon="progress_activity" className="animate-spin-slow" size={20} />
      </span>
    </button>
  );
}
