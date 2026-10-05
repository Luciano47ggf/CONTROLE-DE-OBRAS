"use client";

import { useTransition } from "react";
import type { ActionState } from "@/lib/types";

/** Botão "Remover foto", com confirmação; mesmo padrão usado para excluir foto de obra na galeria */
export function RemovePhotoButton({ onRemove, label = "Remover foto" }: { onRemove: () => Promise<ActionState>; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-bad hover:underline disabled:opacity-50"
      onClick={() => {
        if (!window.confirm("Remover esta foto?")) return;
        start(async () => {
          await onRemove();
        });
      }}
    >
      {pending ? "Removendo…" : label}
    </button>
  );
}
