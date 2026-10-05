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

type PhotonFeature = {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    countrycode?: string;
  };
  geometry: { coordinates: [number, number] }; // [lon, lat]
};

/** Linha de endereço: nome do lugar (se houver) + rua e número */
function addressLine(p: PhotonFeature["properties"]): string {
  const street = [p.street, p.housenumber].filter(Boolean).join(", ");
  if (p.name && p.name !== p.street) return [p.name, street].filter(Boolean).join(", ");
  return street || p.name || p.district || p.city || "";
}

/** Texto do item na lista de resultados */
function resultLabel(p: PhotonFeature["properties"]): string {
  const line1 = p.name ?? [p.street, p.housenumber].filter(Boolean).join(", ");
  const line2 = [p.district, p.city, p.state].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" — ") || "Endereço sem nome";
}

function toResult(f: PhotonFeature): AddressResult {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  return {
    address: addressLine(p),
    city: p.city ?? p.district ?? "",
    state: stateToUf(p.state),
    latitude: lat,
    longitude: lon,
  };
}

/**
 * Busca de endereço ou estabelecimento sem chave de API, usando o Photon (komoot), que
 * indexa os mesmos dados do OpenStreetMap mas busca bem por nome de lugar (shopping,
 * hotel, loja etc.), não só por rua/bairro. Serviço público e gratuito, com limite de uso
 * — por isso a busca é disparada só depois que a pessoa para de digitar. Para um volume
 * alto de buscas, considere uma instância própria do Photon/Nominatim ou um serviço pago.
 */
export function AddressAutocomplete({ onSelect }: { onSelect: (r: AddressResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PhotonFeature[]>([]);
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
      // lat/lon/zoom: viés para o Brasil (não é filtro rígido) — sem isso, nomes comuns
      // (ex. "Padaria Nossa Senhora") trazem até Portugal entre os primeiros resultados e
      // empurram os brasileiros para fora do limite antes do filtro por país, abaixo.
      fetch(
        `https://photon.komoot.io/api/?limit=15&lat=-15.78&lon=-47.93&zoom=5&location_bias_scale=0.9&q=${encodeURIComponent(q)}`,
        { signal: controller.signal },
      )
        .then((res) => {
          if (!res.ok) throw new Error("busca falhou");
          return res.json() as Promise<{ features: PhotonFeature[] }>;
        })
        .then((data) => {
          const br = (data.features ?? []).filter((f) => f.properties.countrycode === "BR").slice(0, 8);
          setResults(br);
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
      <label className="label" htmlFor="maps-search">Buscar endereço ou estabelecimento</label>
      <input
        id="maps-search"
        type="text"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Digite o nome do local, rua, bairro ou cidade…"
        className="input"
      />
      <p className="mt-1 text-xs text-muted">
        {loading ? "Buscando…" : "Escolha um resultado para preencher endereço, cidade e UF."}
      </p>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-paper shadow-lg">
          {results.map((f, i) => (
            <li key={i}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-wall"
                onClick={() => {
                  onSelect(toResult(f));
                  setQuery(resultLabel(f.properties));
                  setOpen(false);
                }}
              >
                {resultLabel(f.properties)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
