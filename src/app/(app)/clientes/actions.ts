"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbError, formObject, optInt, optText, requiredText, zodErrors } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const schema = z.object({
  name: requiredText("Nome"),
  legal_name: optText,
  document: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const digits = v.replace(/\D/g, "");
      if (digits.length !== 11 && digits.length !== 14) {
        ctx.addIssue({ code: "custom", message: "CPF deve ter 11 dígitos e CNPJ 14." });
        return z.NEVER;
      }
      return digits;
    }),
  address: optText,
  city: optText,
  state: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!/^[A-Za-z]{2}$/.test(v)) {
        ctx.addIssue({ code: "custom", message: "Use a sigla, por exemplo MT." });
        return z.NEVER;
      }
      return v.toUpperCase();
    }),
  phone: optText,
  email: z.union([z.email("E-mail inválido."), z.undefined()]).transform((v) => v ?? null),
  contact_name: optText,
  notes: optText,
  default_swap_days: optInt(1, 3650),
});

export async function saveClient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(formObject(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const id = fd.get("id") as string | null;
  const values = { ...parsed.data, active: fd.get("active") !== "off" };

  const supabase = await createClient();
  const res = id
    ? await supabase.from("clients").update(values).eq("id", id).select("id").single()
    : await supabase.from("clients").insert(values).select("id").single();
  if (res.error) return dbError(res.error);

  revalidatePath("/clientes");
  redirect(`/clientes/${res.data.id}`);
}
