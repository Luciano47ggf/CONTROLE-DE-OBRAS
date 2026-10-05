import { photoUrl } from "@/lib/format";

const TINTS = [
  "bg-accent-tint text-accent",
  "bg-warn-tint text-warn",
  "bg-bad-tint text-bad",
  "bg-ok-tint text-ok",
  "bg-wall text-ink-soft",
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

/** Logo do cliente; sem logo, cai para um avatar com a inicial do nome (cor determinística) */
export function ClientAvatar({ name, logoPath, size = 44 }: { name: string; logoPath?: string | null; size?: number }) {
  const url = photoUrl(logoPath);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={`Logo de ${name}`}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const tint = TINTS[hashName(name) % TINTS.length];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-serif font-medium ${tint}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
