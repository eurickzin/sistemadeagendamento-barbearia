import Link from "next/link";

import CadastroButton from "@/app/components/CadastroButton";
import Reveal from "@/app/components/Reveal";

const features = [
  {
    number: "01",
    title: "Agendamentos online",
    description:
      "Seus clientes podem visualizar os horários disponíveis e realizar o agendamento de forma rápida e simples.",
  },
  {
    number: "02",
    title: "Gestão de clientes",
    description:
      "Tenha seus clientes organizados em um só lugar e facilite o acompanhamento dos atendimentos.",
  },
  {
    number: "03",
    title: "Serviços e horários",
    description:
      "Configure seus serviços, duração dos atendimentos e horários de funcionamento da sua barbearia.",
  },
  {
    number: "04",
    title: "Agenda organizada",
    description:
      "Visualize seus agendamentos e tenha uma rotina muito mais organizada, sem depender de planilhas ou anotações.",
  },
  {
    number: "05",
    title: "Link personalizado",
    description:
      "Compartilhe sua página de agendamento com seus clientes pelo WhatsApp, Instagram ou onde quiser.",
  },
  {
    number: "06",
    title: "Experiência profissional",
    description:
      "Ofereça aos seus clientes uma experiência moderna desde o primeiro contato até o atendimento.",
  },
];

const steps = [
  {
    number: "01",
    title: "Crie sua conta",
    description:
      "Cadastre sua barbearia e tenha acesso ao seu painel de gerenciamento.",
  },
  {
    number: "02",
    title: "Configure sua agenda",
    description:
      "Cadastre seus serviços, horários de funcionamento e organize sua disponibilidade.",
  },
  {
    number: "03",
    title: "Compartilhe seu link",
    description:
      "Envie seu link de agendamento para seus clientes através do WhatsApp, Instagram ou redes sociais.",
  },
  {
    number: "04",
    title: "Deixe o Na Régua+ trabalhar",
    description:
      "Seus clientes agendam online enquanto você mantém tudo organizado em um só lugar.",
  },
];

const benefits = [
  {
    number: "01",
    title: "Organização",
    description: "Tenha sua agenda e seus clientes sempre à mão.",
  },
  {
    number: "02",
    title: "Praticidade",
    description: "Facilite o agendamento para você e seus clientes.",
  },
  {
    number: "03",
    title: "Profissionalismo",
    description: "Ofereça uma experiência moderna desde o primeiro contato.",
  },
  {
    number: "04",
    title: "Controle",
    description: "Tenha uma visão mais clara da rotina da sua barbearia.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      {/* NAVBAR */}
      <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-[#0B0F14]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Reveal direction="left">
            <Link
              href="#inicio"
              className="text-xl font-bold tracking-tight transition-opacity duration-300 hover:opacity-80"
            >
              Na Régua
              <span className="text-[#C9A227]">+</span>
            </Link>
          </Reveal>

          <div className="hidden items-center gap-8 md:flex">
            <Reveal direction="up" delay={50}>
              <a
                href="#funcionalidades"
                className="group relative text-sm text-zinc-400 transition hover:text-white"
              >
                Funcionalidades
                <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />
              </a>
            </Reveal>

            <Reveal direction="up" delay={100}>
              <a
                href="#como-funciona"
                className="group relative text-sm text-zinc-400 transition hover:text-white"
              >
                Como funciona
                <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />
              </a>
            </Reveal>

            <Reveal direction="up" delay={150}>
              <a
                href="#beneficios"
                className="group relative text-sm text-zinc-400 transition hover:text-white"
              >
                Benefícios
                <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />
              </a>
            </Reveal>
          </div>

          {/* NÃO ENVOLVER O BOTÃO COM REVEAL */}
<div className="flex items-center gap-3">
  <Link
    href="/painel/login"
    className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-[#C9A227]/30 hover:bg-white/5 hover:text-white"
  >
    Sou barbeiro
  </Link>

  <CadastroButton />
</div>
        </nav>
      </header>

      {/* HERO */}
      <section
        id="inicio"
        className="relative overflow-hidden border-b border-white/10"
      >
        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#C9A227]/10 blur-[140px]" />

        <div className="relative mx-auto flex min-h-[760px] max-w-6xl items-center px-6 pb-24 pt-40">
          <Reveal direction="left">
            <div className="max-w-4xl">
              <div className="mb-7 inline-flex items-center rounded-full border border-[#C9A227]/20 bg-[#C9A227]/5 px-4 py-2">
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#C9A227]" />

                <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9A227]">
                  Gestão inteligente para barbearias
                </span>
              </div>

              <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
                Sua barbearia
                <span className="block text-[#C9A227]">na régua.</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400 sm:text-xl">
                Organize seus agendamentos, clientes, serviços e horários em um
                só lugar. O Na Régua+ simplifica a gestão da sua barbearia para
                você focar no que realmente importa: seus clientes.
              </p>

              <div className="mt-10">
                <Reveal direction="up" delay={200}>
                  <a
                    href="#funcionalidades"
                    className="block rounded-md border border-white/15 px-7 py-4 text-center font-semibold text-white transition hover:-translate-y-[1px] hover:border-white/25 hover:bg-white/5"
                  >
                    Conhecer o sistema
                  </a>
                </Reveal>
              </div>

              <Reveal direction="up" delay={300}>
                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-zinc-500">
                  <span>✓ Agenda online</span>
                  <span>✓ Gestão de clientes</span>
                  <span>✓ Fácil de usar</span>
                </div>
              </Reveal>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="border-b border-white/10 py-24">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 md:grid-cols-2 md:items-center">
          <Reveal direction="left">
            <div>
              <span className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A227]">
                Menos complicação
              </span>

              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Chega de organizar sua barbearia no improviso.
              </h2>
            </div>
          </Reveal>

          <Reveal direction="right" delay={120}>
            <div className="space-y-5 text-zinc-400">
              <p className="leading-7">
                Mensagens espalhadas no WhatsApp, horários anotados em papel,
                clientes esquecidos e aquela dúvida constante sobre qual horário
                está disponível.
              </p>

              <p className="leading-7">
                O Na Régua+ foi criado para deixar essa rotina mais simples,
                organizada e profissional.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="border-b border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="left">
            <div className="max-w-2xl">
              <span className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A227]">
                Funcionalidades
              </span>

              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Tudo que você precisa para organizar sua barbearia.
              </h2>

              <p className="mt-5 leading-7 text-zinc-400">
                Uma plataforma simples para centralizar sua operação e oferecer
                uma experiência melhor para seus clientes.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal
                key={feature.number}
                direction={index % 2 === 0 ? "left" : "right"}
                delay={index * 80}
              >
                <article className="group h-full bg-[#0B0F14] p-8 transition hover:bg-white/[0.03]">
                  <span className="text-sm font-medium text-[#C9A227]">
                    {feature.number}
                  </span>

                  <h3 className="mt-6 text-xl font-semibold">
                    {feature.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-zinc-500 transition group-hover:text-zinc-400">
                    {feature.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-b border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A227]">
                Como funciona
              </span>

              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Comece em poucos passos.
              </h2>

              <p className="mt-5 leading-7 text-zinc-400">
                Configure sua barbearia uma vez e tenha sua agenda organizada no
                dia a dia.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal key={step.number} direction="up" delay={index * 120}>
                <article className="h-full">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-[#C9A227]/30 bg-[#C9A227]/5 text-sm font-bold text-[#C9A227]">
                    {step.number}
                  </div>

                  <h3 className="text-lg font-semibold">{step.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-zinc-500">
                    {step.description}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="border-b border-white/10 py-24">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 md:grid-cols-2 md:items-center">
          <Reveal direction="left">
            <div>
              <span className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A227]">
                Por que Na Régua+?
              </span>

              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Mais organização para você.
                <span className="block text-[#C9A227]">
                  Mais praticidade para seus clientes.
                </span>
              </h2>

              <p className="mt-6 leading-7 text-zinc-400">
                Sua barbearia merece uma ferramenta que acompanhe sua rotina,
                sem complicar o que deveria ser simples.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <Reveal
                key={benefit.number}
                direction={index % 2 === 0 ? "left" : "right"}
                delay={index * 100}
              >
                <div className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-[#C9A227]/20">
                  <div className="text-2xl font-bold text-[#C9A227]">
                    {benefit.number}
                  </div>

                  <h3 className="mt-4 font-semibold">{benefit.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {benefit.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

{/* CTA */}
<section className="relative overflow-hidden py-28">
  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A227]/10 blur-[130px]" />

  <Reveal direction="up">
    <div className="relative mx-auto max-w-4xl px-6 text-center">
      <span className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A227]">
        Comece agora
      </span>

      <h2 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
        Coloque sua barbearia
        <span className="block text-[#C9A227]">na régua.</span>
      </h2>

      <p className="mx-auto mt-6 max-w-xl leading-7 text-zinc-400">
        Tenha uma gestão mais simples, uma agenda organizada e uma
        experiência melhor para seus clientes.
      </p>
    </div>
  </Reveal>

  {/* BOTÃO FORA DO REVEAL */}
  <div className="relative z-10 mt-9 flex justify-center">
    <CadastroButton />
  </div>
</section>
      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <Reveal direction="left">
            <div>
              <div className="text-lg font-bold tracking-tight">
                Na Régua
                <span className="text-[#C9A227]">+</span>
              </div>

              <p className="mt-2 text-sm text-zinc-500">
                Gestão simples para barbearias que querem crescer.
              </p>
            </div>
          </Reveal>

          <Reveal direction="up" delay={100}>
            <div className="flex gap-6 text-sm text-zinc-500">
              <Link href="#inicio" className="transition hover:text-white">
                Voltar ao topo
              </Link>
            </div>
          </Reveal>

          <Reveal direction="right" delay={150}>
            <div className="text-sm text-zinc-600">
              © 2026 Na Régua+. Todos os direitos reservados.
            </div>
          </Reveal>
        </div>
      </footer>
    </main>
  );
}
