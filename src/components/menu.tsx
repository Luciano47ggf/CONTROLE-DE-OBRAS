"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * Menu "···" simples: abre/fecha ao clicar, fecha ao clicar fora, com Esc ou ao rolar a
 * página. O conteúdo é renderizado num portal (fora da árvore do card), com posição fixa
 * calculada a partir do botão — assim nunca fica cortado por um ancestral com overflow
 * escondido (cards de cliente, ambiente e ponto de exposição usam overflow-hidden).
 */
export function Menu({ items, label = "Mais opções" }: { items: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-ghost px-2"
      >
        <MoreHorizontal size={16} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-50 min-w-48 overflow-hidden rounded-md border border-line bg-paper py-1 shadow-lg"
            onClick={() => setOpen(false)}
          >
            {items}
          </div>,
          document.body,
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
