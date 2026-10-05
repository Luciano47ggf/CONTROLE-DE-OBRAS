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

/** Avatar com a inicial do nome; cor determinística (mesmo cliente, mesma cor) */
export function ClientAvatar({ name, size = 44 }: { name: string; size?: number }) {
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
