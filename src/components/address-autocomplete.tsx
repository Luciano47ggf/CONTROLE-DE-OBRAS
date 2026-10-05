"use client";

import { useEffect, useRef, useState } from "react";

export type AddressResult = {
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
};

const BR_STATES: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapá: "AP", amazonas: "AM", bahia: "BA",
  ceará: "CE", "distrito federal": "DF", "espírito santo": "ES", goiás: "GO",
  maranhão: "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
  pará: "PA", paraíba: "PB", paraná: "PR", pernambuco: "PE", piauí: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
  rondônia: "RO", roraima: "RR", "santa catarina": "SC", "são paulo": "SP",
  sergipe: "SE", tocantins: "TO",
};
function stateToUf(name: string | undefined): string {
  if (!name) return "";
  return BR_STATES[name.trim().toLowerCase()] ?? name.slice(0, 2).toUpperCase();
}

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
};

function toResult(r: NominatimResult): AddressResult {
  const a = r.address ?? {};
  const address = [a.road, a.house_number].filter(Boolean).join(", ") || r.display_name;
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
  return { address, city, state: stateToUf(a.state), latitude: Number(r.lat), longitude: Number(r.lon) };
}

/**
 * Busca de endereço sem chave de API, usando o Nominatim (OpenStreetMap). Serviço público e
 * gratuito, mas com limite de uso (~1 req/s) — por isso a busca é disparada só depois que a
 * pessoa para de digitar, não a cada tecla. Para um volume alto de buscas, considere um
 * Nominatim próprio ou um serviço pago.
 */
export function AddressAutocomplete({ onSelect }: { onSelect: (r: AddressResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&accept-language=pt-BR&limit=6&q=${encodeURIComponent(q)}`,
        { signal: controller.signal },
      )
        .then((res) => {
          if (!res.ok) throw new Error("busca falhou");
          return res.json() as Promise<NominatimResult[]>;
        })
        .then((data) => {
          setResults(data);
          setOpen(true);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError("Não foi possível buscar o endereço agora.");
        })
        .finally(() => setLoading(false));
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <label className="label" htmlFor="maps-search">Buscar endereço</label>
      <input
        id="maps-search"
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Digite rua, bairro ou cidade…"
        className="input"
      />
      <p className="mt-1 text-xs text-muted">
        {loading ? "Buscando…" : "Escolha um resultado para preencher endereço, cidade e UF."}
      </p>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-paper shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-wall"
                onClick={() => {
                  onSelect(toResult(r));
                  setQuery(r.display_name);
                  setOpen(false);
                }}
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
