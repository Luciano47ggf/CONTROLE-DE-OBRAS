"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { ClientCard } from "./client-card";
import { ClientDrawer } from "./client-drawer";
import { EmptyState } from "@/components/ui";
import { swapText } from "@/lib/format";

export type ClientSummary = {
  id: string;
  name: string;
  segment: string | null;
  active: boolean;
  spaceCount: number;
  occupantCount: number;
  nextSwapDays: number | null;
  previewPhoto: string | null;
};

type SortKey = "name" | "swap" | "spaces";
type StatusFilter = "ativos" | "inativos" | "todos";

/** Quadro de clientes: busca, filtro, ordenação, grade/lista e o painel lateral */
export function ClientsBoard({ clients, canWrite }: { clients: ClientSummary[]; canWrite: boolean }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ativos");
  const [sort, setSort] = useState<SortKey>("name");
  const [view, setView] = useState<"grade" | "lista">("grade");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = clients;
    if (status !== "todos") list = list.filter((c) => (status === "ativos" ? c.active : !c.active));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(needle) || c.segment?.toLowerCase().includes(needle));
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (sort === "spaces") sorted.sort((a, b) => b.spaceCount - a.spaceCount);
    if (sort === "swap") sorted.sort((a, b) => (a.nextSwapDays ?? Infinity) - (b.nextSwapDays ?? Infinity));
    return sorted;
  }, [clients, status, q, sort]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar clientes, obras, artistas ou espaços…"
          className="input max-w-xs"
          aria-label="Buscar clientes"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="input w-auto">
          <option value="ativos">Status: Ativos</option>
          <option value="inativos">Status: Inativos</option>
          <option value="todos">Status: Todos</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input w-auto">
          <option value="name">Ordenar por: Nome (A-Z)</option>
          <option value="swap">Ordenar por: Próxima troca</option>
          <option value="spaces">Ordenar por: Mais espaços</option>
        </select>
        <div className="ml-auto flex overflow-hidden rounded-md border border-line" role="group" aria-label="Formato da lista">
          <button
            type="button"
            onClick={() => setView("grade")}
            aria-label="Ver em grade"
            aria-pressed={view === "grade"}
            className={`px-2.5 py-2 ${view === "grade" ? "bg-accent text-white" : "bg-paper text-muted hover:text-ink"}`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setView("lista")}
            aria-label="Ver em lista"
            aria-pressed={view === "lista"}
            className={`px-2.5 py-2 ${view === "lista" ? "bg-accent text-white" : "bg-paper text-muted hover:text-ink"}`}
          >
            <ListIcon size={16} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={q ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}>
          {q ? "Confira a grafia ou limpe a busca." : "Cadastre um cliente para começar."}
        </EmptyState>
      ) : view === "grade" ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} canWrite={canWrite} onOpen={() => setOpenId(c.id)} />
          ))}
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Cliente</th><th>Status</th><th>Espaços</th><th>Obras em exibição</th><th>Próxima troca</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                  <td>
                    <span className="font-medium">{c.name}</span>
                    {c.segment && <span className="block text-xs text-muted">{c.segment}</span>}
                  </td>
                  <td>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.active ? "bg-ok-tint text-ok" : "bg-line text-muted"}`}>
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="tabular-nums">{c.spaceCount}</td>
                  <td className="tabular-nums">{c.occupantCount}</td>
                  <td>{c.nextSwapDays === null ? "—" : swapText(c.nextSwapDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientDrawer clientId={openId} canWrite={canWrite} onClose={() => setOpenId(null)} />
    </div>
  );
}
