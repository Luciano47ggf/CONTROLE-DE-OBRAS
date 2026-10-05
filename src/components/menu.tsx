"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

/** Menu "···" simples: abre/fecha ao clicar, fecha ao clicar fora ou com Esc */
export function Menu({ items, label = "Mais opções" }: { items: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-ghost px-2"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-48 overflow-hidden rounded-md border border-line bg-paper py-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {items}
        </div>
      )}
    </div>
  );
}

export function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="block w-full px-3 py-2 text-left text-sm hover:bg-wall">
      {children}
    </Link>
  );
}

export function MenuButton({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm hover:bg-wall" {...props}>
      {children}
    </button>
  );
}
