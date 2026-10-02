import { PageHeader } from "@/components/ui";
import { ClientForm } from "../client-form";

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="Novo cliente" back={{ href: "/clientes", label: "Clientes" }} />
      <div className="panel max-w-3xl p-6 sm:p-8"><ClientForm /></div>
    </>
  );
}
