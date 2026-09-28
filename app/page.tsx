import Image from "next/image";
import CadastroButton from "@/app/components/CadastroButton";

const services = [
  {
    name: "Corte Masculino",
    description: "Corte personalizado com acabamento profissional.",
    price: "R$ 35",
    duration: "40 min",
  },
  {
    name: "Barba",
    description: "Modelagem e acabamento completo da barba.",
    price: "R$ 25",
    duration: "30 min",
  },
  {
    name: "Corte + Barba",
    description: "O combo completo para renovar o visual.",
    price: "R$ 55",
    duration: "70 min",
  },
  {
    name: "Sobrancelha",
    description: "Design e limpeza das sobrancelhas.",
    price: "R$ 15",
    duration: "20 min",
  },
  {
    name: "Corte Infantil",
    description: "Corte especial para crianças com cuidado e atenção.",
    price: "R$ 30",
    duration: "35 min",
  },
  {
    name: "Corte + Barba + Sobrancelha",
    description: "Pacote completo para um visual impecável.",
    price: "R$ 70",
    duration: "90 min",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 z-50 w-full border-b border-white/10 bg-[#0B0F14]/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
<a
  href="#inicio"
  className="text-xl font-bold tracking-wider transition-opacity duration-300 hover:opacity-80"
>
  RK BARBER<span className="text-[#C9A227]">.</span>
</a>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#inicio"
              className="group relative text-sm text-zinc-300 transition hover:text-white"
            >
              Início
              <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />
            </a>

            <a
              href="#servicos"
              className="group relative text-sm text-zinc-300 transition hover:text-white"
            >
              Serviços
              <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />
            </a>

            <a
              href="#sobre"
              className="group relative text-sm text-zinc-300 transition hover:text-white"
            >
              Sobre
              <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />
            </a>

            <a
              href="#contato"
              className="group relative text-sm text-zinc-300 transition hover:text-white"
            >
              Contato
              <span className="absolute -bottom-2 left-0 h-[2px] w-0 bg-[#C9A227] transition-all duration-300 group-hover:w-full" />
            </a>
          </div>

<div className="flex items-center gap-3">
  <a
    href="https://wa.me/5584999999999"
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-md bg-[#C9A227] px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#e0bb35]"
  >
    Agendar
  </a>

  <CadastroButton />
</div>
          
        </nav>
      </header>

      {/* HERO */}
      <section
        id="inicio"
        className="mx-auto flex min-h-[650px] max-w-6xl items-center px-6 py-24"
      >
        <div className="max-w-3xl">
          <span className="text-sm font-medium uppercase tracking-[0.3em] text-[#C9A227]">
            Estilo • Precisão • Qualidade
          </span>

          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            Seu estilo começa
            <span className="block text-[#C9A227]">na cadeira.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
            Cortes modernos, barba impecável e atendimento de qualidade. Agende
            seu horário e deixe o resto com a gente.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="https://wa.me/5584999999999"
              target="_blank"
              className="rounded-md bg-[#C9A227] px-7 py-4 text-center font-semibold text-black hover:-translate-y-[1px] transition hover:bg-[#e0bb35]"
            >
              Agendar horário
            </a>

            <a
              href="#servicos"
              className="rounded-md border border-white/15 px-7 py-4 text-center hover:-translate-y-[1px] font-semibold transition hover:bg-white/5"
            >
              Ver serviços
            </a>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A227]">
              Nossos serviços
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Escolha seu estilo
            </h2>

            <p className="mt-4 text-zinc-400">
              Serviços pensados para você sair daqui com o visual em dia.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.name}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-[#C9A227]/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold">{service.name}</h3>

                  <span className="whitespace-nowrap text-lg font-bold text-[#C9A227]">
                    {service.price}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  {service.description}
                </p>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <span className="text-sm text-zinc-500">
                    {service.duration}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="border-t border-white/10 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div>
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[#C9A227]">
              Sobre nós
            </span>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Mais que um corte.
              <br />
              Uma experiência.
            </h2>

            <p className="mt-6 leading-7 text-zinc-400">
              Nossa barbearia nasceu para unir tradição e estilo moderno. Cada
              atendimento é pensado para oferecer um momento de cuidado,
              confiança e qualidade.
            </p>

            <p className="mt-4 leading-7 text-zinc-400">
              Do primeiro contato ao acabamento final, nosso objetivo é fazer
              você sair daqui satisfeito com seu visual.
            </p>
          </div>

          <div className="relative min-h-[350px] overflow-hidden rounded-xl border border-white/10">
            <Image
              src="/images/fotobarbearia.jpg"
              alt="Foto da barbearia"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pronto para renovar o visual?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Escolha o serviço, encontre o melhor horário e faça seu agendamento
            em poucos minutos.
          </p>

          <a
            href="https://wa.me/5584999999999"
            target="_blank"
            className="mt-8 inline-block rounded-md bg-[#C9A227] px-8 hover:-translate-y-[1px] py-4 font-semibold text-black transition hover:bg-[#e0bb35]"
          >
            Agendar meu horário
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contato" className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-bold">
              RK BARBER<span className="text-[#C9A227]">.</span>
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              Seu estilo começa aqui.
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            © 2026 RK Barber. Todos os direitos reservados.
          </div>
        </div>
      </footer>
      <a
        href="#inicio"
        className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#C9A227] text-xl font-bold text-black shadow-lg transition hover:scale-110 hover:bg-[#e0bb35]"
        aria-label="Voltar ao topo"
      >
        ⬆
      </a>
    </main>
  );
}
