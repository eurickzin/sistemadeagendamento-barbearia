import PaginaPublicaBarbearia, {
  type Barbearia,
  type DadosAgendamentoPublicos,
} from "./BarbeariaPublicaClient";
import {
  carregarBarbeariaPublica,
  carregarServicosEBarbeirosPublicos,
} from "@/lib/supabase/public-data";

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
        erroInicial="Esta barbearia não existe ou está indisponível."
      />
    );
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
