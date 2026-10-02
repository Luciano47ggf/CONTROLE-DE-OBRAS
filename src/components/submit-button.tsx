"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} name={name} value={value}>
      {pending ? (pendingText ?? "Salvando…") : children}
    </button>
  );
}

export function FormAlert({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-md border border-bad/30 bg-bad-tint px-4 py-3 text-sm text-bad">
      {error}
    </div>
  );
}
