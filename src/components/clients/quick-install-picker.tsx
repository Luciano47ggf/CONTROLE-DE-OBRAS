"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { InstallDrawer } from "./install-drawer";
import { getClientWorkspace } from "@/app/(app)/clientes/workspace-actions";
import { dims } from "@/lib/format";
import type { ClientWorkspace } from "@/lib/queries";

type PickedSpace = { id: string; name: string; occupiedBy: string | null; swapDays: number };

/**
 * Atalho da visão geral: escolhe em qual ponto de exposição do cliente instalar, sem
 * precisar abrir o painel do cliente primeiro. Depois de escolher, usa o mesmo
 * InstallDrawer de sempre — nenhuma lógica de instalação é duplicada aqui.
 */
export function QuickInstallPicker({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [data, setData] = useState<ClientWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [space, setSpace] = useState<PickedSpace | null>(null);

  useEffect(() => {
    let cancelled = false;
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

  if (space) {
    return (
      <InstallDrawer
        spaceId={space.id}
        spaceName={space.name}
        clientId={clientId}
        occupiedBy={space.occupiedBy}
        defaultSwapDays={space.swapDays}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher onde adicionar a obra"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="font-serif text-xl">Adicionar obra</p>
            {data && <p className="text-sm text-muted">{data.client.name}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="btn-ghost px-2">
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-muted">Carregando…</p>}
          {error && <p className="text-sm text-bad">{error}</p>}
          {data && (
            <>
              <p className="mb-4 text-sm text-muted">Escolha em qual ponto de exposição instalar.</p>
              {data.environments.length === 0 ? (
                <p className="text-sm text-muted">
                  Este cliente ainda não tem ambientes cadastrados. Cadastre um ambiente e um ponto de exposição primeiro.
                </p>
              ) : (
                <div className="space-y-5">
                  {data.environments.map((env) => {
                    const spaces = data.spaces.filter((s) => s.environment_id === env.id);
                    if (spaces.length === 0) return null;
                    return (
                      <div key={env.id}>
                        <p className="mb-2 text-sm font-medium">{env.name}</p>
                        <ul className="space-y-1.5">
                          {spaces.map((s) => {
                            const occ = data.occupants.find((o) => o.space_id === s.id);
                            return (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-left text-sm hover:border-muted"
                                  onClick={() =>
                                    setSpace({
                                      id: s.id,
                                      name: s.name,
                                      occupiedBy: occ?.artwork_title ?? null,
                                      swapDays: s.swap_days ?? data.defaultSwapDays,
                                    })
                                  }
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium">{s.name}</span>
                                    <span className="block text-xs text-muted">{dims(s.width_cm, s.height_cm)}</span>
                                  </span>
                                  <span className={`shrink-0 text-xs ${occ ? "text-muted" : "text-ok"}`}>
                                    {occ ? `Ocupado: ${occ.artwork_title}` : "Vazio"}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
