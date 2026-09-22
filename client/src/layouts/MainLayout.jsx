import { Outlet } from 'react-router-dom'

function MainLayout() {
  return (
    <div className="min-h-screen overflow-hidden bg-cream text-ink">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a href="/" className="flex items-center gap-3" aria-label="DAE2UNI Pathway home">
          <span className="grid size-10 place-items-center rounded-xl bg-forest text-sm font-black tracking-tight text-white shadow-lg shadow-forest/15">
            D2U
          </span>
          <span className="font-bold tracking-tight">DAE2UNI Pathway</span>
        </a>
        <span className="rounded-full border border-forest/15 bg-white/60 px-3 py-1.5 text-xs font-semibold text-forest backdrop-blur">
          Foundation release
        </span>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mx-auto max-w-7xl px-6 py-8 text-sm text-ink/60 lg:px-10">
        Built for DAE CIT students exploring university pathways in Punjab.
      </footer>
    </div>
  )
}

export default MainLayout
