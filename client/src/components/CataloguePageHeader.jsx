export default function CataloguePageHeader({ eyebrow, title, description }) {
  return (
    <header className="border-b border-[var(--ui-border)] pb-8 pt-2 sm:pb-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title mt-3 max-w-4xl text-4xl text-navy sm:text-5xl">{title}</h1>
      <p className="body-copy mt-4 max-w-3xl text-base sm:text-lg">{description}</p>
    </header>
  )
}
