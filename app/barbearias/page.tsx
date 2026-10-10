import CatalogoBarbearias from "./_components/CatalogoBarbearias";
import { carregarCatalogoPublico } from "@/lib/supabase/public-data";

interface Barbearia {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  logo_url: string | null;
}

export default async function BarbeariasPage() {
  const { data, error } = await carregarCatalogoPublico();

  if (error) console.error("Erro ao carregar barbearias:", error.message);

  return (
    <CatalogoBarbearias
      barbearias={data as Barbearia[]}
      erroInicial={!!error}
    />
  );
}
