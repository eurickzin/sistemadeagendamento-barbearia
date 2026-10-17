import CatalogoBarbearias from "./_components/CatalogoBarbearias";
import { carregarCatalogoPublico } from "@/lib/neon/public-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barbearias | Na Régua+",
  description: "Encontre barbearias e agende seu horário pelo Na Régua+.",
  openGraph: {
    title: "Barbearias | Na Régua+",
    description: "Encontre barbearias e agende seu horário pelo Na Régua+.",
    type: "website",
  },
};

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
