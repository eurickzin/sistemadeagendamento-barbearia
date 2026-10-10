import PaginaPublicaBarbearia, {
  type Barbearia,
  type BarbeiroPublico,
  type Servico,
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
        servicosIniciais={[]}
        barbeirosIniciais={[]}
        erroInicial="Não foi possível carregar a barbearia."
      />
    );
  }

  if (!barbearia) {
    return (
      <PaginaPublicaBarbearia
        key={slug}
        barbeariaInicial={null}
        servicosIniciais={[]}
        barbeirosIniciais={[]}
        erroInicial="Esta barbearia não existe ou está indisponível."
      />
    );
  }

  const dadosPublicos = await carregarServicosEBarbeirosPublicos(barbearia.id);

  if (dadosPublicos.erroServicos) console.error("Erro ao carregar serviços públicos:", dadosPublicos.erroServicos.message);
  if (dadosPublicos.erroBarbeiros) console.error("Erro ao carregar barbeiros públicos:", dadosPublicos.erroBarbeiros.message);

  return (
    <PaginaPublicaBarbearia
      key={slug}
      barbeariaInicial={barbearia as Barbearia}
      servicosIniciais={dadosPublicos.servicos as Servico[]}
      barbeirosIniciais={dadosPublicos.barbeiros as BarbeiroPublico[]}
      erroServicosInicial={dadosPublicos.erroServicos ? "Não foi possível carregar os serviços." : ""}
      erroBarbeirosInicial={dadosPublicos.erroBarbeiros ? "Não foi possível carregar a equipe agora." : ""}
    />
  );
}
