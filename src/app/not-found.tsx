import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-3 px-8">
      <p className="title-serif text-3xl">Registro não encontrado</p>
      <p className="text-muted">O endereço pode estar errado ou o registro foi removido.</p>
      <Link href="/" className="btn-primary">Ir para a visão geral</Link>
    </div>
  );
}
