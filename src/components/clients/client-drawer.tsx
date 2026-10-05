"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Maximize2 } from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import { ClientWorkspaceView } from "./client-workspace";
import { Menu, MenuLink } from "@/components/menu";
import { Photo } from "@/components/ui";
import { getClientWorkspace } from "@/app/(app)/clientes/workspace-actions";
import type { ClientWorkspace } from "@/lib/queries";

/**
 * Painel lateral do cliente: mesma visão em abas da página maximizada (/clientes/[id]),
 * só que num drawer. "Maximizar" é uma navegação normal para a página cheia.
 */
export function ClientDrawer({
  clientId,
  canWrite,
  onClose,
}: {
  clientId: string | null;
  canWrite: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<ClientWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const open = !!clientId;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    setData(null);
    getClientWorkspace(clientId)
      .then((res) => {
        if (cancelled) return;
        if (!res) setError("Cliente não encontrado.");
        else setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar o cliente.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-paper shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={data ? data.client.name : "Painel do cliente"}
      >
        {loading && <div className="p-6 text-sm text-muted">Carregando…</div>}
        {error && <div className="p-6 text-sm text-bad">{error}</div>}
        {data && (
          <>
            {data.client.cover_path && (
              <div className="h-28 shrink-0 bg-wall">
                <Photo path={data.client.cover_path} alt="" className="h-full w-full" />
              </div>
            )}
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <ClientAvatar name={data.client.name} logoPath={data.client.logo_path} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-serif text-xl">{data.client.name}</p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                        data.client.active ? "bg-ok-tint text-ok" : "bg-line text-muted"
                      }`}
                    >
                      {data.client.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {data.client.segment && <p className="truncate text-sm text-muted">{data.client.segment}</p>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/clientes/${data.client.id}`} className="btn-secondary gap-1.5 px-2.5 py-1.5 text-xs">
                  <Maximize2 size={14} /> Maximizar
                </Link>
                {canWrite && (
                  <Menu
                    label="Mais opções do cliente"
                    items={
                      <>
                        <MenuLink href={`/clientes/${data.client.id}/editar`}>Editar cliente</MenuLink>
                        <MenuLink href={`/clientes/${data.client.id}/espacos/novo`}>Adicionar espaço</MenuLink>
                      </>
                    }
                  />
                )}
                <button type="button" onClick={onClose} aria-label="Fechar" className="btn-ghost px-2">
                  <X size={16} />
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ClientWorkspaceView data={data} canWrite={canWrite} variant="drawer" />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
