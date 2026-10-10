import PaginaPublicaBarbearia, {
  type Barbearia,
  type BarbeiroPublico,
  type Servico,
} from "./BarbeariaPublicaClient";
import { createClient } from "@/lib/supabase/server";

export default async function PaginaBarbearia({
  params,
}: PageProps<"/barbearia/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  let { data: barbearia, error } = await supabase
    .from("barbearias")
    .select(
      "id, nome, slug, telefone, descricao, logo_url, capa_url, instagram, endereco, horario_abertura, horario_fechamento, ativa",
    )
    .eq("slug", slug)
    .eq("ativa", true)
    .maybeSingle();

  if (error) {
    const resultadoBasico = await supabase
      .from("barbearias")
      .select("id, nome, slug, telefone, descricao, logo_url, ativa")
      .eq("slug", slug)
      .eq("ativa", true)
      .maybeSingle();

    error = resultadoBasico.error;
    barbearia = resultadoBasico.data
      ? {
          ...resultadoBasico.data,
          capa_url: null,
          instagram: null,
          endereco: null,
          horario_abertura: "08:00",
          horario_fechamento: "21:00",
        }
      : null;
  }

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

  const [resultadoServicos, resultadoBarbeiros] = await Promise.all([
    supabase
      .from("servicos")
      .select("id, nome, descricao, preco, duracao, ativo")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("barbeiros")
      .select("id, nome, horario_abertura, horario_fechamento, dia_folga")
      .eq("barbearia_id", barbearia.id)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
  ]);

  if (resultadoServicos.error) console.error("Erro ao carregar serviços públicos:", resultadoServicos.error.message);
  if (resultadoBarbeiros.error) console.error("Erro ao carregar barbeiros públicos:", resultadoBarbeiros.error.message);

  return (
    <PaginaPublicaBarbearia
      key={slug}
      barbeariaInicial={barbearia as Barbearia}
      servicosIniciais={(resultadoServicos.data ?? []) as Servico[]}
      barbeirosIniciais={(resultadoBarbeiros.data ?? []) as BarbeiroPublico[]}
      erroServicosInicial={resultadoServicos.error ? "Não foi possível carregar os serviços." : ""}
      erroBarbeirosInicial={resultadoBarbeiros.error ? "Não foi possível carregar a equipe agora." : ""}
    />
  );
}
