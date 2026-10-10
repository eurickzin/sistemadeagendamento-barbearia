export default function LoadingCatalogoBarbearias() {
  return (
    <main className="min-h-screen animate-pulse bg-[#0B0F14] text-white" aria-label="Carregando barbearias">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-5">
          <div className="h-6 w-28 rounded bg-white/10" />
          <div className="h-9 w-36 rounded-xl bg-white/10" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-5">
        <div className="h-3 w-44 rounded bg-white/10" />
        <div className="mt-4 h-12 max-w-md rounded bg-white/10" />
        <div className="mt-5 h-4 max-w-xl rounded bg-white/10" />
        <div className="mt-10 h-14 max-w-xl rounded-2xl border border-white/10 bg-[#11151B]" />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-80 rounded-2xl border border-white/10 bg-[#11151B]" />
          ))}
        </div>
      </section>
    </main>
  );
}
