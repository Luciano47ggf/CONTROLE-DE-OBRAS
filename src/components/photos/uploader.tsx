"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { PHOTO_MAX_PER_UPLOAD, PHOTO_TYPES, extFor, photoProblem } from "@/lib/photo-rules";
import type { ActionState } from "@/lib/types";

type Item = { name: string; state: "enviando" | "processando" | "pronto" | "erro"; message?: string };

/**
 * Envia os originais direto do navegador para o Storage (sem passar pelo limite de
 * corpo das funções da Vercel) e depois pede ao servidor para registrar e gerar as versões.
 */
export function PhotoUploader({
  folder,
  multiple = true,
  label = "Adicionar fotos",
  onUploaded,
}: {
  folder: string; // ex.: obras/{artworkId}
  multiple?: boolean;
  label?: string;
  onUploaded: (paths: string[]) => Promise<ActionState>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function handle(files: File[]) {
    setError(undefined);
    if (!files.length) return;
    if (files.length > PHOTO_MAX_PER_UPLOAD) {
      setError(`Envie no máximo ${PHOTO_MAX_PER_UPLOAD} fotos por vez.`);
      return;
    }
    const problems = files.map(photoProblem).filter(Boolean) as string[];
    if (problems.length) {
      setError(problems.join(" "));
      return;
    }
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, state: "enviando" })));
    const supabase = getBrowserClient();
    const paths: string[] = [];

    await Promise.all(
      files.map(async (file, i) => {
        const path = `${folder}/${crypto.randomUUID()}/original.${extFor(file.type)}`;
        const { error: upErr } = await supabase.storage.from("acervo").upload(path, file, { contentType: file.type });
        setItems((cur) => cur.map((it, j) => (j === i ? { ...it, state: upErr ? "erro" : "processando", message: upErr?.message } : it)));
        if (!upErr) paths.push(path);
      }),
    );

    if (paths.length) {
      const res = await onUploaded(paths);
      if (res.error) setError(res.error);
      setItems((cur) => cur.map((it) => (it.state === "processando" ? { ...it, state: res.error && !res.ok ? "erro" : "pronto" } : it)));
      router.refresh();
    } else {
      setError("Nenhuma foto foi enviada. Verifique a conexão e tente de novo.");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!busy) handle(Array.from(e.dataTransfer.files).slice(0, multiple ? undefined : 1));
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center text-sm transition-colors ${
          over ? "border-accent bg-accent-tint" : "border-line bg-paper hover:border-muted"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <ImagePlus size={22} strokeWidth={1.5} className="text-muted" />
        <span className="font-medium text-ink">{busy ? "Enviando…" : label}</span>
        <span className="text-xs text-muted">Arraste aqui ou clique. JPG, PNG ou WebP até 30 MB.</span>
        <input
          ref={input}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          multiple={multiple}
          className="sr-only"
          disabled={busy}
          data-testid="photo-input"
          onChange={(e) => handle(Array.from(e.target.files ?? []))}
        />
      </label>
      {items.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-muted" aria-live="polite">
          {items.map((it, i) => (
            <li key={i} className={it.state === "erro" ? "text-bad" : it.state === "pronto" ? "text-ok" : ""}>
              {it.name}: {it.state === "enviando" ? "enviando" : it.state === "processando" ? "gerando versões" : it.state === "pronto" ? "pronta" : `falhou${it.message ? ` (${it.message})` : ""}`}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
