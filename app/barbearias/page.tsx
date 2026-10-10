import CatalogoBarbearias from "./_components/CatalogoBarbearias";
import { createClient } from "@/lib/supabase/server";

interface Barbearia {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  logo_url: string | null;
}

export default async function BarbeariasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("barbearias")
    .select("id, nome, slug, descricao, logo_url")
    .eq("ativa", true)
    .order("nome", { ascending: true });

  if (error) console.error("Erro ao carregar barbearias:", error);

  return (
    <CatalogoBarbearias
      barbearias={(data ?? []) as Barbearia[]}
      erroInicial={!!error}
    />
  );
}
