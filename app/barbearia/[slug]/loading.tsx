export default function LoadingBarbearia() {
  return (
    <main className="min-h-screen animate-pulse bg-[#0B0F14] text-white" aria-label="Carregando página da barbearia">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-5">
          <div className="h-6 w-28 rounded bg-white/10" />
          <div className="h-9 w-36 rounded-lg bg-white/10" />
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-5 sm:pt-12">
        <div className="flex flex-col gap-6 border border-white/10 bg-[#11151B] p-5 sm:flex-row sm:items-center sm:p-8">
          <div className="h-24 w-24 shrink-0 rounded-xl bg-white/10" />
          <div className="w-full">
            <div className="h-3 w-48 rounded bg-white/10" />
            <div className="mt-4 h-9 max-w-sm rounded bg-white/10" />
            <div className="mt-4 h-4 max-w-xl rounded bg-white/10" />
            <div className="mt-2 h-4 max-w-md rounded bg-white/10" />
            <div className="mt-6 h-11 w-40 rounded-xl bg-[#C9A227]/30" />
          </div>
        </div>

        <div className="mt-12">
          <div className="h-3 w-40 rounded bg-white/10" />
          <div className="mt-3 h-8 w-60 rounded bg-white/10" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-52 rounded-2xl border border-white/10 bg-[#11151B]" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
