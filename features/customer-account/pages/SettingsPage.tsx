"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/neon/client";
import { saveOwnProfile } from "@/lib/neon/profile";
import { deleteProfileImage, uploadProfileImage } from "@/lib/profile-images";
import Icon from "@/components/ui/Icon";

interface BarbeariaFavorita {
  id: string;
  nome: string;
  slug: string;
}

export default function ConfiguracoesClientePage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [favoritas, setFavoritas] = useState<BarbeariaFavorita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregarPerfil() {
      const { data: { user } } = await createClient().auth.getUser();
      if (cancelado) return;
      if (!user) {
        router.replace("/");
        return;
      }
      const { data: perfil } = await createClient().from("profiles")
        .select("nome, telefone, avatar_url, barbearias_favoritas")
        .eq("id", user.id).maybeSingle();
      setNome(perfil?.nome || user.user_metadata?.displayName || "");
      setTelefone(perfil?.telefone ?? user.user_metadata?.phone ?? "");
      setEmail(user.email ?? "");
      setAvatarUrl(perfil?.avatar_url ?? user.user_metadata?.profileImageUrl ?? "");
      const salvas = perfil?.barbearias_favoritas;
      setFavoritas(Array.isArray(salvas) ? salvas.filter(
        (item): item is BarbeariaFavorita => typeof item?.id === "string" && typeof item?.nome === "string" && typeof item?.slug === "string",
      ) : []);
      setCarregando(false);
    }
    void carregarPerfil();
    return () => { cancelado = true; };
  }, [router]);

  async function salvarPerfil() {
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const neon = createClient();
      const { data: { user }, error: userError } = await neon.auth.getUser();
      if (userError || !user) throw new Error("Faça login novamente para editar seu perfil.");
      const nomeSalvo = nome.trim();
      const telefoneSalvo = telefone.trim();
      if (nomeSalvo.length > 120 || telefoneSalvo.length > 30) {
        throw new Error("Confira o nome e o telefone informados.");
      }
      const profileSaved = await saveOwnProfile(neon, user.id, {
        nome: nomeSalvo, telefone: telefoneSalvo, avatar_url: avatarUrl, barbearias_favoritas: favoritas,
      });
      if (!profileSaved) throw new Error("Não foi possível confirmar a atualização do perfil. Tente novamente.");
      setMensagem("Perfil atualizado com sucesso.");
    } catch (saveError) {
      setErro(saveError instanceof Error ? saveError.message : "Erro ao salvar perfil.");
    } finally {
      setSalvando(false);
    }
  }

  async function enviarAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setErro("");
    setMensagem("");
    setSalvando(true);
    let novaUrl: string | null = null;
    try {
      const neon = createClient();
      const { data: { user } } = await neon.auth.getUser();
      if (!user) throw new Error("Faça login novamente para enviar sua foto.");
      novaUrl = await uploadProfileImage(file, user.id, "avatar");
      const profileSaved = await saveOwnProfile(neon, user.id, { avatar_url: novaUrl });
      if (!profileSaved) throw new Error("Não foi possível vincular a foto ao perfil.");
      const urlAnterior = avatarUrl;
      setAvatarUrl(novaUrl);
      novaUrl = null;
      setMensagem("Foto do perfil salva.");
      if (urlAnterior) {
        try { await deleteProfileImage(urlAnterior, user.id); } catch { /* Older or external avatars are retained. */ }
      }
    } catch (uploadError) {
      if (novaUrl) {
        try {
          const neon = createClient();
          const { data: { user } } = await neon.auth.getUser();
          if (user) {
            const { data: perfil, error: consultaError } = await neon.from("profiles")
              .select("avatar_url").eq("id", user.id).maybeSingle();
            if (!consultaError && perfil?.avatar_url === novaUrl) {
              setAvatarUrl(novaUrl);
              setMensagem("Foto do perfil salva.");
              return;
            }
            if (!consultaError && perfil?.avatar_url !== novaUrl) {
              await deleteProfileImage(novaUrl, user.id);
            }
          }
        } catch { /* An uncertain write must not delete a possibly linked file. */ }
      }
      setErro(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar a foto.");
    } finally {
      setSalvando(false);
    }
  }

  async function sair() {
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (carregando) {
    return <main className="min-h-screen bg-[#0B0F14] px-4 pt-24 text-white sm:px-6"><div className="mx-auto h-64 max-w-3xl animate-pulse bg-white/5" /></main>;
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 pb-10 pt-20 text-white sm:px-6 sm:pt-24 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => router.push("/minha-conta")} className="group mb-8 inline-flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-zinc-300 shadow-sm transition hover:border-[#C9A227]/40 hover:bg-[#C9A227]/[0.07] hover:text-[#E0BB35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]">
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-base transition group-hover:border-[#C9A227]/40">←</span>
          Voltar para minha conta
        </button>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#C9A227]">Sua conta</p>
          <h1 className="mt-2 text-3xl font-bold">Configurações</h1>
          <p className="mt-2 text-sm text-zinc-500">Atualize seu perfil e gerencie sua conta.</p>
        </header>

        <section className="border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C9A227]/10 text-xl font-bold text-[#C9A227]">
              {avatarUrl ? <img src={avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover" /> : (nome || email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">Perfil</h2>
              <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[#C9A227] transition hover:text-[#E0BB35]">
                <Icon name="edit" className="h-4 w-4" /> Alterar foto
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={enviarAvatar} className="sr-only" />
              </label>
            </div>
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="text-sm text-zinc-400">Nome
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" maxLength={120} className="mt-2 min-h-11 w-full border border-white/10 bg-[#11151B] px-3 text-white outline-none focus:border-[#C9A227]" />
            </label>
            <label className="text-sm text-zinc-400">Telefone
              <input value={telefone} onChange={(event) => setTelefone(event.target.value)} autoComplete="tel" inputMode="tel" maxLength={30} className="mt-2 min-h-11 w-full border border-white/10 bg-[#11151B] px-3 text-white outline-none focus:border-[#C9A227]" />
            </label>
            <div className="text-sm text-zinc-400 sm:col-span-2">E-mail<p className="mt-2 break-all text-white">{email || "—"}</p></div>
          </div>

          {favoritas.length > 0 && (
            <div className="mt-7 border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold text-white">Barbearias favoritas</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {favoritas.map((favorita) => <li key={favorita.id} className="border border-[#C9A227]/25 px-3 py-2 text-sm text-zinc-300">{favorita.nome}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button type="button" onClick={salvarPerfil} disabled={salvando} className="min-h-11 bg-[#C9A227] px-5 text-sm font-semibold text-black transition hover:bg-[#E0BB35] disabled:opacity-50">
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
            {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
            {mensagem && <p role="status" className="text-sm text-emerald-400">{mensagem}</p>}
          </div>
        </section>

        <div className="mt-6 border-t border-white/10 pt-6">
          <button type="button" onClick={sair} className="inline-flex min-h-11 items-center gap-2 border border-red-500/25 px-4 text-sm font-medium text-red-400 transition hover:bg-red-500/5">
            <Icon name="logout" className="h-4 w-4" /> Sair da conta
          </button>
        </div>
      </div>
    </main>
  );
}
