"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { releaseRepeat } from "@/app/(app)/clientes/workspace-actions";

/**
 * Selo de obra já exibida neste cliente, com a ação de liberar a repetição manualmente.
 * A liberação fica registrada (quem, quando, motivo) e aparece no histórico do cliente.
 */
export function BlockedBadge({ artworkId, clientId }: { artworkId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (done) {
    return <p className="text-xs font-medium text-ok">Liberação registrada no histórico</p>;
  }

  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <p className="inline-flex items-center gap-1 rounded bg-bad-tint px-2 py-0.5 text-xs font-medium text-bad">
        <Lock size={11} /> Já exibida neste cliente
      </p>
      {!open ? (
        <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => setOpen(true)}>
          Liberar repetição
        </button>
      ) : (
        <div className="space-y-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            aria-label="Motivo da liberação"
            className="input py-1 text-xs"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending}
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() =>
                start(async () => {
                  const res = await releaseRepeat(artworkId, clientId, reason);
                  if (res.error) setError(res.error);
                  else setDone(true);
                })
              }
            >
              {pending ? "Liberando…" : "Confirmar liberação"}
            </button>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
          {error && <p className="text-xs text-bad">{error}</p>}
        </div>
      )}
    </div>
  );
}
