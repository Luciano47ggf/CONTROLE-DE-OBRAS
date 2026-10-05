import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; inativo?: string }> }) {
  const { next, inativo } = await searchParams;
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <Image src="/img_3577.webp" alt="" fill priority className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <Image src="/SIC01.webp" alt="Sic Bartão" width={500} height={353} className="relative h-auto w-44 self-start" priority />
        <div className="relative max-w-md">
          <p className="font-serif text-3xl leading-snug">
            Cada parede, a obra certa. Cada obra, um novo lugar.
          </p>
          <p className="mt-3 text-paper/60">
            Controle do acervo, das instalações e do rodízio de obras nos clientes.
          </p>
        </div>
        <p className="relative text-sm text-paper/40">Acesso restrito à equipe</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="title-serif text-3xl">Entrar</h1>
          <p className="mb-8 mt-1 text-muted">Use o e-mail e a senha cadastrados pela administração.</p>
          {inativo && (
            <p role="alert" className="mb-5 rounded-md border border-bad/30 bg-bad-tint px-4 py-3 text-sm text-bad">
              Sua conta foi desativada. Fale com um administrador.
            </p>
          )}
          <LoginForm next={next ?? "/"} />
        </div>
      </section>
    </div>
  );
}
