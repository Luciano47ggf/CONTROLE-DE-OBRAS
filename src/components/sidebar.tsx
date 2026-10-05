"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ROLE_LABEL } from "@/lib/format";
import { useState } from "react";
import {
  LayoutGrid, Frame, Users, Palette, CalendarClock, Settings, LogOut, Menu, X, ShieldCheck, UserRound,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Visão geral", icon: LayoutGrid },
  { href: "/obras", label: "Acervo e estoque", icon: Frame },
  { href: "/clientes", label: "Clientes e espaços", icon: Users },
  { href: "/trocas", label: "Trocas", icon: CalendarClock },
  { href: "/artistas", label: "Artistas", icon: Palette },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
const ADMIN_NAV = [{ href: "/usuarios", label: "Usuários", icon: ShieldCheck }];

export function Sidebar({ userName, role, isAdmin, signOut }: { userName: string; role: string; isAdmin: boolean; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* barra superior no celular/tablet */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2 text-paper lg:hidden">
        <Image src="/SIC01.webp" alt="Sic Bartão" width={500} height={353} className="h-auto w-28" priority />
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Fechar menu" : "Abrir menu"} className="p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink text-paper/80 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 pb-4 pt-7">
          <Image src="/SIC01.webp" alt="Sic Bartão" width={500} height={353} className="h-auto w-36" priority />
          <p className="mt-1 text-sm text-paper/50">Circulação de obras</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Principal">
          {[...NAV, ...(isAdmin ? ADMIN_NAV : [])].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive(href) ? "bg-paper/10 text-paper" : "hover:bg-paper/5 hover:text-paper"
              }`}
            >
              <Icon size={17} strokeWidth={1.75} className={isActive(href) ? "text-brass" : ""} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-paper/10 px-6 py-5">
          <Link href="/conta" onClick={() => setOpen(false)} className="group flex items-center gap-2">
            <UserRound size={16} className="shrink-0 text-paper/50 group-hover:text-paper" />
            <span className="min-w-0">
              <span className="block truncate text-sm text-paper group-hover:underline">{userName}</span>
              <span className="block text-xs text-paper/50">{ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? role}</span>
            </span>
          </Link>
          <form action={signOut} className="mt-3">
            <button className="flex items-center gap-2 text-sm text-paper/60 hover:text-paper">
              <LogOut size={15} /> Sair
            </button>
          </form>
        </div>
      </aside>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}
    </>
  );
}
