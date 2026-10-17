import PaginaPublicaBarbearia, {
  type Barbearia,
  type DadosAgendamentoPublicos,
} from "./BarbeariaPublicaClient";
import {
  carregarBarbeariaPublica,
  carregarServicosEBarbeirosPublicos,
} from "@/lib/neon/public-data";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: PageProps<"/barbearia/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { data: barbearia } = await carregarBarbeariaPublica(slug);
  if (!barbearia) return { title: "Barbearia não encontrada | Na Régua+", robots: { index: false } };

  const title = `${barbearia.nome} | Na Régua+`;
  const description = barbearia.descricao?.trim().slice(0, 155) || `Agende seu horário na ${barbearia.nome}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function PaginaBarbearia({
  params,
}: PageProps<"/barbearia/[slug]">) {
  const { slug } = await params;
  const { data: barbearia, error } = await carregarBarbeariaPublica(slug);

  if (error) {
    console.error("Erro ao carregar barbearia pública:", error);
    return (
      <PaginaPublicaBarbearia
        key={slug}
        barbeariaInicial={null}
        dadosPublicosPromise={Promise.resolve({
          servicos: [],
          erroServicos: null,
          barbeiros: [],
          erroBarbeiros: null,
        }) satisfies Promise<DadosAgendamentoPublicos>}
        erroInicial="Não foi possível carregar a barbearia."
      />
    );
  }

  if (!barbearia) {
    notFound();
  }

  const dadosPublicosPromise = carregarServicosEBarbeirosPublicos(barbearia.id);

  return (
    <PaginaPublicaBarbearia
      key={slug}
      barbeariaInicial={barbearia as Barbearia}
      dadosPublicosPromise={dadosPublicosPromise as Promise<DadosAgendamentoPublicos>}
    />
  );
}
