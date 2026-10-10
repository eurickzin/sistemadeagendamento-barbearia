import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

export const carregarBarbeariaPublica = unstable_cache(
  async (slug: string) => {
    let { data, error } = await supabase
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
      data = resultadoBasico.data
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

    return {
      data,
      error: error ? { code: error.code, message: error.message } : null,
    };
  },
  ["barbearia-publica-v1", process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""],
  { revalidate: 60, tags: ["barbearias-publicas"] },
);

export const carregarCatalogoPublico = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from("barbearias")
      .select("id, nome, slug, descricao, logo_url")
      .eq("ativa", true)
      .order("nome", { ascending: true });

    return {
      data: data ?? [],
      error: error ? { code: error.code, message: error.message } : null,
    };
  },
  ["catalogo-barbearias-publico-v1", process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""],
  { revalidate: 60, tags: ["barbearias-publicas"] },
);

export const carregarServicosEBarbeirosPublicos = unstable_cache(
  async (barbeariaId: string) => {
    const [servicos, barbeiros] = await Promise.all([
      supabase
        .from("servicos")
        .select("id, nome, descricao, preco, duracao, ativo")
        .eq("barbearia_id", barbeariaId)
        .eq("ativo", true)
        .is("excluido_em", null)
        .order("nome", { ascending: true }),
      supabase
        .from("barbeiros")
        .select("id, nome, horario_abertura, horario_fechamento, dia_folga")
        .eq("barbearia_id", barbeariaId)
        .eq("ativo", true)
        .order("nome", { ascending: true }),
    ]);

    return {
      servicos: servicos.data ?? [],
      erroServicos: servicos.error
        ? { code: servicos.error.code, message: servicos.error.message }
        : null,
      barbeiros: barbeiros.data ?? [],
      erroBarbeiros: barbeiros.error
        ? { code: barbeiros.error.code, message: barbeiros.error.message }
        : null,
    };
  },
  ["dados-agendamento-publico-v1", process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""],
  { revalidate: 60, tags: ["barbearias-publicas"] },
);
