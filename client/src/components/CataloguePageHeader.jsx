export default function CataloguePageHeader({ eyebrow, title, description }) {
  return (
    <header className="rounded-[2rem] bg-forest px-6 py-9 text-white shadow-2xl shadow-forest/15 sm:px-10 sm:py-12">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-mint">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-white/75 sm:text-lg">{description}</p>
    </header>
  )
}
