"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/lib/types";

export function DeleteButton({ action, label, confirm }: { action: () => Promise<ActionState>; label: string; confirm: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button
        type="button"
        className="btn-danger"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirm)) return;
          start(async () => {
            const res = await action();
            if (res?.error) setError(res.error);
          });
        }}
      >
        {pending ? "Removendo…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
