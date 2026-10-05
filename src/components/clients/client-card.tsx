"use client";

import { Square, Frame, CalendarClock, LayoutGrid } from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import { Menu, MenuLink } from "@/components/menu";
import { Photo } from "@/components/ui";
import { plural, swapText } from "@/lib/format";
import type { ClientSummary } from "./clients-board";

/** Card de cliente na visão geral: abre o painel lateral ao clicar */
export function ClientCard({ client, canWrite, onOpen }: { client: ClientSummary; canWrite: boolean; onOpen: () => void }) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="panel flex cursor-pointer flex-col overflow-hidden text-left transition-colors hover:border-muted"
    >
      <div className="flex items-start justify-between gap-2 px-5 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <ClientAvatar name={client.name} logoPath={client.logoPath} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{client.name}</p>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                  client.active ? "bg-ok-tint text-ok" : "bg-line text-muted"
                }`}
              >
                {client.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            {client.segment && <p className="truncate text-sm text-muted">{client.segment}</p>}
          </div>
        </div>
        {canWrite && (
          <Menu
            label={`Mais opções de ${client.name}`}
            items={
              <>
                <MenuLink href={`/clientes/${client.id}`}>Abrir cliente</MenuLink>
                <MenuLink href={`/clientes/${client.id}/editar`}>Editar cliente</MenuLink>
                <MenuLink href={`/clientes/${client.id}/espacos/novo`}>Adicionar espaço</MenuLink>
              </>
            }
          />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pb-5 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <LayoutGrid size={13} /> <span className="tabular-nums text-ink">{client.environmentCount}</span> {plural(client.environmentCount, "ambiente", "ambientes")}
        </span>
        <span className="flex items-center gap-1.5">
          <Square size={13} /> <span className="tabular-nums text-ink">{client.spaceCount}</span> {plural(client.spaceCount, "ponto", "pontos")}
        </span>
        <span className="flex items-center gap-1.5">
          <Frame size={13} /> <span className="tabular-nums text-ink">{client.occupantCount}</span> {plural(client.occupantCount, "obra", "obras")}
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <CalendarClock size={13} /> {client.nextSwapDays === null ? "Sem troca prevista" : swapText(client.nextSwapDays)}
        </span>
      </div>

      {client.coverPath && (
        <div className="mt-4 aspect-[16/10] bg-wall">
          <Photo path={client.coverPath} alt="" className="h-full w-full" />
        </div>
      )}
    </article>
  );
}
