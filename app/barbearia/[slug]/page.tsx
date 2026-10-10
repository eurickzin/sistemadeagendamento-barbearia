import PaginaPublicaBarbearia, {
  type Barbearia,
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
        erroInicial="Esta barbearia não existe ou está indisponível."
      />
    );
  }

  return (
    <PaginaPublicaBarbearia
      key={slug}
      barbeariaInicial={barbearia as Barbearia}
      servicosIniciais={[]}
    />
  );
}
